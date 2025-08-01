-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences table policies
DROP POLICY IF EXISTS user_preferences_select_own ON user_preferences;
CREATE POLICY user_preferences_select_own ON user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_preferences_update_own ON user_preferences;
CREATE POLICY user_preferences_update_own ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_preferences_insert_own ON user_preferences;
CREATE POLICY user_preferences_insert_own ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_preferences_delete_own ON user_preferences;
CREATE POLICY user_preferences_delete_own ON user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Events table policies
DROP POLICY IF EXISTS events_select_own ON events;
CREATE POLICY events_select_own ON events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS events_update_own ON events;
CREATE POLICY events_update_own ON events FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS events_insert_own ON events;
CREATE POLICY events_insert_own ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS events_delete_own ON events;
CREATE POLICY events_delete_own ON events FOR DELETE USING (auth.uid() = user_id);

-- AI conversations table policies
DROP POLICY IF EXISTS ai_conversations_select_own ON ai_conversations;
CREATE POLICY ai_conversations_select_own ON ai_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_conversations_update_own ON ai_conversations;
CREATE POLICY ai_conversations_update_own ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_conversations_insert_own ON ai_conversations;
CREATE POLICY ai_conversations_insert_own ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_conversations_delete_own ON ai_conversations;
CREATE POLICY ai_conversations_delete_own ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- Sessions table policies
DROP POLICY IF EXISTS sessions_select_own ON sessions;
CREATE POLICY sessions_select_own ON sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_update_own ON sessions;
CREATE POLICY sessions_update_own ON sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_insert_own ON sessions;
CREATE POLICY sessions_insert_own ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sessions_delete_own ON sessions;
CREATE POLICY sessions_delete_own ON sessions FOR DELETE USING (auth.uid() = user_id); 