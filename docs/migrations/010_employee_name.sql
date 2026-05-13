-- Migration 010: employee_name for game identity
-- 사원명: 게임 점수/랭킹/실적판에 표시되는 사용자 식별명 (토닥이 이름과 별개)
-- 허용 문자: 한글, 영문, 숫자, 공백, !@#$%^&()-_. (최대 10자)
-- Apply:
--   npx wrangler d1 migrations apply DB --remote

ALTER TABLE users ADD COLUMN employee_name TEXT;

CREATE INDEX IF NOT EXISTS idx_users_employee_name
ON users(employee_name)
WHERE employee_name IS NOT NULL;
