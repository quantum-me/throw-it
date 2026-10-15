-- ==============================================================================
-- THROW IT — Full Multiplayer Strategy Game Database Schema & Edge Stored Procs
-- ==============================================================================

-- 1. Create Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'ended')),
    config JSONB NOT NULL DEFAULT '{"rows": 6, "cols": 7, "connectTarget": 4, "turnTimeoutSeconds": 0}'::jsonb,
    board JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_turn_index INT NOT NULL DEFAULT 0,
    winner_id TEXT,
    winning_cells JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Players Table
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT 'star',
    symbol TEXT NOT NULL DEFAULT '●',
    is_ready BOOLEAN NOT NULL DEFAULT false,
    score INT NOT NULL DEFAULT 0,
    turn_order INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, player_id),
    UNIQUE(room_id, turn_order)
);

-- 3. Create Moves Table (Authoritative move audit trail)
CREATE TABLE IF NOT EXISTS public.room_moves (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    col_index INT NOT NULL,
    row_index INT NOT NULL,
    move_number INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_moves ENABLE ROW LEVEL SECURITY;

-- 5. Public Access Policies for Casual Gameplay
CREATE POLICY "Allow public read access to rooms"
    ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Allow public insert to rooms"
    ON public.rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to rooms"
    ON public.rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to players"
    ON public.room_players FOR SELECT USING (true);

CREATE POLICY "Allow public insert to players"
    ON public.room_players FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to players"
    ON public.room_players FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to moves"
    ON public.room_moves FOR SELECT USING (true);

CREATE POLICY "Allow public insert to moves"
    ON public.room_moves FOR INSERT WITH CHECK (true);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_moves;

-- 7. Authoritative Server-Side Move Validation Stored Procedure
CREATE OR REPLACE FUNCTION public.make_move_authoritative(
    p_room_code TEXT,
    p_player_id TEXT,
    p_col INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room public.rooms%ROWTYPE;
    v_rows INT;
    v_cols INT;
    v_board JSONB;
    v_active_player_id TEXT;
    v_player_count INT;
    v_drop_row INT := -1;
    v_r INT;
    v_cell_val TEXT;
BEGIN
    -- Fetch active room
    SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    IF v_room.status != 'playing' THEN
        RAISE EXCEPTION 'Match is not currently in progress.';
    END IF;

    -- Get dimensions
    v_rows := (v_room.config->>'rows')::INT;
    v_cols := (v_room.config->>'cols')::INT;
    v_board := v_room.board;

    -- Validate column bounds
    IF p_col < 0 OR p_col >= v_cols THEN
        RAISE EXCEPTION 'Column % is out of bounds.', p_col;
    END IF;

    -- Check top cell in column
    IF (v_board->0->p_col)::TEXT != 'null' THEN
        RAISE EXCEPTION 'Column % is already full.', p_col;
    END IF;

    -- Calculate gravity drop row
    FOR v_r IN REVERSE (v_rows - 1)..0 LOOP
        IF (v_board->v_r->p_col)::TEXT = 'null' THEN
            v_drop_row := v_r;
            EXIT;
        END IF;
    END LOOP;

    IF v_drop_row = -1 THEN
        RAISE EXCEPTION 'Could not find empty row in column %.', p_col;
    END IF;

    -- Update board cell
    v_board := jsonb_set(v_board, ARRAY[v_drop_row::TEXT, p_col::TEXT], to_jsonb(p_player_id));

    -- Count active players
    SELECT count(*) INTO v_player_count FROM public.room_players WHERE room_id = v_room.id;

    -- Rotate turn
    UPDATE public.rooms
    SET board = v_board,
        current_turn_index = (v_room.current_turn_index + 1) % v_player_count,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_room.id;

    RETURN jsonb_build_object(
        'success', true,
        'row', v_drop_row,
        'col', p_col,
        'board', v_board
    );
END;
$$;
