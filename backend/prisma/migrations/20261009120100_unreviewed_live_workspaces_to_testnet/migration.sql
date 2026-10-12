-- Live mode is enabled only through POST /api/settings/environment, which
-- records liveEnabledAt. Workspaces created before that workflow were left
-- marked live without it, and the crypto rail rejects every wallet operation in
-- that state. Return them to test mode; going live again uses the reviewed flow.
UPDATE "Company" SET "isTestMode" = 1 WHERE "isTestMode" = 0 AND "liveEnabledAt" IS NULL;
