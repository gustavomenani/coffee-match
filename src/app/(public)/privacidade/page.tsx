import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Política de privacidade da Coffee Match: quais dados coletamos e como usamos.",
  alternates: { canonical: absoluteUrl("/privacidade") },
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de privacidade"
      subtitle="Última atualização: julho de 2026"
    >
      <section className="space-y-2">
        <h2>1. Quem somos</h2>
        <p>
          A Coffee Match opera a plataforma e os eventos de speed dating
          descritos nestes documentos. Esta política explica quais dados
          pessoais tratamos e para quais finalidades.
        </p>
      </section>

      <section className="space-y-2">
        <h2>2. Dados que coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Nome</strong> — identificação no evento e nos matches.
          </li>
          <li>
            <strong>E-mail</strong> — login, comunicações sobre ingressos e
            eventos.
          </li>
          <li>
            <strong>Telefone</strong> — contato e liberação de WhatsApp em
            caso de match mútuo.
          </li>
          <li>
            <strong>Gênero</strong> e data de nascimento — organização de
            vagas, elegibilidade 18+ e dinâmica do evento.
          </li>
          <li>
            <strong>Votos</strong> e preferências de interesse na noite —
            cálculo de matches mútuos.
          </li>
          <li>
            Dados de pagamento processados pelo provedor (ex.: Mercado Pago);
            não armazenamos o número completo do cartão.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>3. Como usamos</h2>
        <p>Usamos seus dados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>criar e autenticar sua conta;</li>
          <li>vender e validar ingressos e check-in;</li>
          <li>organizar rodadas, votação e matches mútuos;</li>
          <li>compartilhar contato apenas entre pares com match;</li>
          <li>prevenir fraudes, abusos e violações das regras;</li>
          <li>cumprir obrigações legais e de segurança.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>4. Compartilhamento</h2>
        <p>
          <strong>Não vendemos seus dados.</strong> Podemos compartilhar
          informações apenas com:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            outros participantes com quem você tenha match mútuo
            (telefone/contato);
          </li>
          <li>
            processadores de pagamento e infraestrutura necessários à
            operação;
          </li>
          <li>autoridades, quando exigido por lei.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>5. Retenção e segurança</h2>
        <p>
          Mantemos os dados pelo tempo necessário para a operação dos eventos,
          suporte e obrigações legais. Adotamos medidas razoáveis de proteção,
          mas nenhum sistema é 100% isento de risco.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Seus direitos</h2>
        <p>
          Nos termos da LGPD, você pode solicitar acesso, correção, exclusão
          ou portabilidade dos seus dados, conforme aplicável. Entre em
          contato pelo canal indicado no site. Alguns dados podem ser
          mantidos quando houver base legal (ex.: registros financeiros).
        </p>
      </section>

      <section className="space-y-2">
        <h2>7. Documentos relacionados</h2>
        <p>
          Veja também os <Link href="/termos">Termos de uso</Link> e a{" "}
          <Link href="/reembolso">Política de reembolso</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
