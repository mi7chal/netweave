-- Default: OIDC auto import is opt-in.
INSERT INTO app_settings (key, value)
VALUES ('oidc_auto_import', 'false')
ON CONFLICT (key) DO NOTHING;
