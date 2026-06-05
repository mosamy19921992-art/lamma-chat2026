-- ============================================
-- Supabase Row Level Security (RLS) Policies
-- for Lamma Chat Application
-- ============================================

-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Policy: Users can view all profiles (public info)
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Users can only insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy: Only admins/owners can delete profiles
CREATE POLICY "Only admins can delete profiles" 
ON profiles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- ============================================
-- MESSAGES TABLE POLICIES
-- ============================================

-- Policy: Anyone can view messages in public rooms
CREATE POLICY "Messages are viewable by authenticated users" 
ON messages FOR SELECT 
USING (
  auth.role() = 'authenticated' OR auth.role() = 'anon'
);

-- Policy: Authenticated users can insert messages
CREATE POLICY "Authenticated users can insert messages" 
ON messages FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  sender_uid = auth.uid()
);

-- Policy: Users can only delete their own messages (or admins)
CREATE POLICY "Users can delete own messages or admins can delete any" 
ON messages FOR DELETE 
USING (
  sender_uid = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'mod')
  )
);

-- Policy: Users can only update their own messages (5 min window)
CREATE POLICY "Users can update own messages within 5 minutes" 
ON messages FOR UPDATE 
USING (
  sender_uid = auth.uid() AND 
  created_at > NOW() - INTERVAL '5 minutes'
);

-- ============================================
-- ROOMS TABLE POLICIES
-- ============================================

-- Policy: All users can view public rooms
CREATE POLICY "Public rooms are viewable by everyone" 
ON rooms FOR SELECT 
USING (
  is_private = false OR 
  created_by = auth.uid() OR
  auth.uid() IN (
    SELECT user_id FROM room_members WHERE room_id = rooms.id
  )
);

-- Policy: Authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms" 
ON rooms FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  created_by = auth.uid()
);

-- Policy: Only room creator or admins can update room
CREATE POLICY "Only creator or admins can update room" 
ON rooms FOR UPDATE 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policy: Only admins can delete any room
CREATE POLICY "Only admins can delete rooms" 
ON rooms FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- ============================================
-- BANS TABLE POLICIES
-- ============================================

-- Policy: Only admins/owners can view bans
CREATE POLICY "Only admins can view bans" 
ON bans FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'mod')
  )
);

-- Policy: Only admins/owners can insert bans
CREATE POLICY "Only admins can insert bans" 
ON bans FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'mod')
  )
);

-- Policy: Only admins/owners can delete bans
CREATE POLICY "Only admins can delete bans" 
ON bans FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner', 'mod')
  )
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate message content (prevent empty messages)
CREATE OR REPLACE FUNCTION validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.text IS NULL OR length(trim(NEW.text)) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_message_before_insert BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION validate_message_content();

-- Function to log admin actions (for audit trail)
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE POLICY "Only admins can view logs" 
ON admin_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('old', OLD, 'new', NEW)
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_uid ON messages(sender_uid);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_rooms_is_private ON rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id);

-- ============================================
-- ROW LEVEL SECURITY ENABLEMENT
-- ============================================

ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE bans FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE profiles IS 'User profiles with RLS policies for secure access control';
COMMENT ON TABLE messages IS 'Chat messages with content validation and access control';
COMMENT ON TABLE rooms IS 'Chat rooms with membership and visibility controls';
COMMENT ON TABLE bans IS 'User bans with admin-only access';
COMMENT ON TABLE admin_logs IS 'Audit trail for admin actions';
