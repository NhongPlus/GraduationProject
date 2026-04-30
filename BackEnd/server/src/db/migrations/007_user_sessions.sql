-- Migration: 007_user_sessions
-- Mục đích: Quản lý phiên đăng nhập, hỗ trợ cơ chế "1 tài khoản = 1 thiết bị"
-- Khi user đăng nhập ở thiết bị mới, revoke tất cả session cũ

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_info TEXT,
    token_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index để tìm nhanh session theo user + trạng thái
CREATE INDEX idx_user_sessions_user_id_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
