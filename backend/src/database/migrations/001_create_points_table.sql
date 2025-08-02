-- Create points table with encrypted JSONB data
CREATE TABLE IF NOT EXISTS points (
    id SERIAL PRIMARY KEY,
    points_data TEXT NOT NULL, -- Encrypted JSONB data stored as text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_points_created_at ON points(created_at);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_points_updated_at 
    BEFORE UPDATE ON points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();