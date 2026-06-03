import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { DocHeader, DocSection, DocList } from "@/components/marketing/doc";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "O Life OS é local-first: seus dados ficam num arquivo SQLite no seu dispositivo. Sem coleta, sem telemetria, sem nuvem obrigatória.",
};

export default function PrivacyPage() {
  return (
    <article>
      <DocHeader
        icon={ShieldCheck}
        eyebrow="Privacidade"
        title="Política de Privacidade"
        description="Resumo honesto: o Life OS foi feito para NÃO coletar seus dados. Tudo vive localmente, sob seu controle."
        updated="3 de junho de 2026"
      />

      <DocSection title="1. O princípio: local-first">
        <p>
          O Life OS é um sistema <strong>local-first</strong>. Todos os seus dados — finanças,
          projetos, saúde, estudos, contatos, acessos — são gravados num único arquivo{" "}
          <strong>SQLite</strong> (<code>life-os.db</code>) no seu próprio dispositivo. Nós não
          temos servidores que recebem ou armazenam esse conteúdo.
        </p>
      </DocSection>

      <DocSection title="2. O que NÃO coletamos">
        <DocList
          items={[
            "Nenhum dado pessoal é enviado para nós. Não há cadastro em servidor externo.",
            "Sem telemetria, analytics ou rastreadores de terceiros embutidos no app.",
            "Sem cookies de publicidade. A sessão usa apenas um cookie local de autenticação.",
            "Não vendemos, compartilhamos ou monetizamos dados — não os possuímos.",
          ]}
        />
      </DocSection>

      <DocSection title="3. Onde seus dados ficam">
        <p>
          O arquivo do banco fica no caminho que você definir (por padrão algo como{" "}
          <code>~/LifeOS_Data/life-os.db</code>). Você pode copiá-lo, movê-lo para um HD externo ou
          fazer backup quando quiser. Imagens (avatares, peças de guarda-roupa) são guardadas em
          Base64 ou caminhos locais para manter tudo portátil.
        </p>
      </DocSection>

      <DocSection title="4. Nuvem opcional (sob seu controle)">
        <p>
          Você pode, <strong>opcionalmente</strong>, conectar um banco na nuvem (ex.: Turso/libSQL)
          ou provedores de IA na nuvem (OpenAI, Groq, Google). Nesses casos, os dados trafegam para
          serviços que <strong>você</strong> configurou e que se regem pelas políticas de
          privacidade deles. Por padrão, nada disso está ativo — a IA pode rodar 100% local via
          Ollama.
        </p>
      </DocSection>

      <DocSection title="5. Chaves de API e segredos">
        <p>
          Chaves de provedores de IA e credenciais do Cofre de Acessos ficam no seu banco local. O
          Cofre usa criptografia para as senhas armazenadas. Recomendamos manter o arquivo do banco
          e os backups em local seguro.
        </p>
      </DocSection>

      <DocSection title="6. Contato">
        <p>
          Dúvidas sobre privacidade? Fale com a gente em{" "}
          <a href="mailto:luiz.antoniodesouza004@gmail.com">luiz.antoniodesouza004@gmail.com</a> ou
          abra uma issue no{" "}
          <a href="https://github.com/LuixzSouza/Projeto-Life-OS" target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </DocSection>
    </article>
  );
}
