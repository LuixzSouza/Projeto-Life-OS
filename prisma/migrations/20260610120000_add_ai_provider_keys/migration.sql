-- Novos provedores de IA do Cérebro Digital: Claude (Anthropic), Grok (xAI)
-- e OpenRouter (agregador). Chaves cifradas at-rest (lib/settings-crypto).
ALTER TABLE "Settings" ADD COLUMN "anthropicKey" TEXT;
ALTER TABLE "Settings" ADD COLUMN "xaiKey" TEXT;
ALTER TABLE "Settings" ADD COLUMN "openrouterKey" TEXT;
