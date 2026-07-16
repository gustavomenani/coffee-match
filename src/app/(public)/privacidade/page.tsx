import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade — SpeedDate BR",
  description: "Política de privacidade da SpeedDate BR: quais dados coletamos e como usamos.",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        Política de privacidade
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Última atualização: julho de 2026</p>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-700">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">1. Quem somos</h2>
          <p>
            A SpeedDate BR opera a plataforma e os eventos de speed dating
            descritos nestes documentos. Esta política explica quais dados
            pessoais tratamos e para quais finalidades.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">2. Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-zinc-900">Nome</strong> —
              identificação no evento e nos matches.
            </li>
            <li>
              <strong className="font-medium text-zinc-900">E-mail</strong> —
              login, comunicações sobre ingressos e eventos.
            </li>
            <li>
              <strong className="font-medium text-zinc-900">Telefone</strong> —
              contato e liberação de WhatsApp em caso de match mútuo.
            </li>
            <li>
              <strong className="font-medium text-zinc-900">Gênero</strong> e data
              de nascimento — organização de vagas, elegibilidade 18+ e dinâmica
              do evento.
            </li>
            <li>
              <strong className="font-medium text-zinc-900">Votos</strong> e
              preferências de interesse na noite — cálculo de matches mútuos.
            </li>
            <li>
              Dados de pagamento processados pelo provedor (ex.: Mercado Pago);
              não armazenamos o número completo do cartão.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">3. Como usamos</h2>
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
          <h2 className="text-lg font-semibold text-zinc-900">4. Compartilhamento</h2>
          <p>
            <strong className="font-medium text-zinc-900">Não vendemos seus dados.</strong>{" "}
            Podemos compartilhar informações apenas com:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>outros participantes com quem você tenha match mútuo (telefone/contato);</li>
            <li>processadores de pagamento e infraestrutura necessários à operação;</li>
            <li>autoridades, quando exigido por lei.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">5. Retenção e segurança</h2>
          <p>
            Mantemos os dados pelo tempo necessário para a operação dos eventos,
            suporte e obrigações legais. Adotamos medidas razoáveis de proteção,
            mas nenhum sistema é 100% isento de risco.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">6. Seus direitos</h2>
          <p>
            Nos termos da LGPD, você pode solicitar acesso, correção, exclusão
            ou portabilidade dos seus dados, conforme aplicável. Entre em
            contato pelo canal indicado no site. Alguns dados podem ser
            mantidos quando houver base legal (ex.: registros financeiros).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">7. Documentos relacionados</h2>
          <p>
            Veja também os{" "}
            <Link href="/termos" className="font-medium text-rose-600 hover:underline">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/reembolso" className="font-medium text-rose-600 hover:underline">
              Política de reembolso
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
