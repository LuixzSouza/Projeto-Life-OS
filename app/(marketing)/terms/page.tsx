import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { DocHeader, DocSection, DocList } from "@/components/marketing/doc";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso do Life OS — software open source sob licença MIT, fornecido no estado em que se encontra.",
};

export default function TermsPage() {
  return (
    <article>
      <DocHeader
        icon={Scale}
        eyebrow="Legal"
        title="Termos de Uso"
        description="Em resumo: é software livre (MIT), você é dono dos seus dados e responsável por eles."
        updated="3 de junho de 2026"
      />

      <DocSection title="1. Licença">
        <p>
          O Life OS é distribuído como <strong>software open source sob a licença MIT</strong>. Você
          pode usar, copiar, modificar e distribuir o código, respeitando os termos da licença
          disponível no{" "}
          <a href="https://github.com/LuixzSouza/Projeto-Life-OS" target="_blank" rel="noreferrer">
            repositório
          </a>
          .
        </p>
      </DocSection>

      <DocSection title="2. Sem garantias">
        <p>
          O software é fornecido <strong>&quot;no estado em que se encontra&quot;</strong> (as is),
          sem garantias de qualquer tipo. O uso é por sua conta e risco. Não nos responsabilizamos
          por perda de dados, indisponibilidade ou quaisquer danos decorrentes do uso.
        </p>
      </DocSection>

      <DocSection title="3. Seus dados, sua responsabilidade">
        <DocList
          items={[
            "Por ser local-first, a guarda e o backup do arquivo do banco são responsabilidade sua.",
            "Recomendamos backups regulares — o sistema oferece exportação, mas não substitui sua rotina de cópia.",
            "Você é responsável pelo conteúdo que registra e por mantê-lo em conformidade com a lei aplicável.",
          ]}
        />
      </DocSection>

      <DocSection title="4. Serviços de terceiros">
        <p>
          Integrações opcionais (provedores de IA, banco na nuvem, APIs de mídia) são fornecidas por
          terceiros e regidas pelos termos e preços <strong>deles</strong>. Você é responsável por
          suas próprias chaves de API e pelo uso dentro das políticas de cada serviço.
        </p>
      </DocSection>

      <DocSection title="5. Alterações">
        <p>
          Estes termos podem ser atualizados conforme o projeto evolui. Mudanças relevantes serão
          refletidas aqui e no histórico do repositório.
        </p>
      </DocSection>
    </article>
  );
}
