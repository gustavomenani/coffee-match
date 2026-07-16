import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Termos de uso — SpeedDate BR",
  description: "Termos de uso da plataforma SpeedDate BR de speed dating presencial.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de uso"
      subtitle="Última atualização: julho de 2026"
    >
      <section className="space-y-2">
        <h2>1. Aceitação</h2>
        <p>
          Ao criar conta, comprar ingresso ou participar de um evento da
          SpeedDate BR, você concorda com estes Termos de Uso e com as{" "}
          <Link href="/regras">Regras do evento</Link>.
        </p>
      </section>

      <section className="space-y-2">
        <h2>2. Idade mínima (18+)</h2>
        <p>
          Os eventos e a plataforma são exclusivos para maiores de 18 anos.
          Você declara que a data de nascimento informada no cadastro é
          verdadeira. Menores de idade não podem participar, sob nenhuma
          hipótese.
        </p>
      </section>

      <section className="space-y-2">
        <h2>3. Natureza do serviço</h2>
        <p>
          A SpeedDate BR organiza eventos presenciais de speed dating: rodadas
          curtas de conversa, votação no celular e divulgação de matches
          mútuos. Não garantimos encontros românticos, número de matches nem
          resultados específicos.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Conduta</h2>
        <p>
          Você se compromete a agir com respeito, honestidade e civilidade.
          São proibidos assédio, discriminação, discurso de ódio, agressões,
          assédio sexual, uso de substâncias ilícitas no local e qualquer
          comportamento que comprometa a segurança ou o bem-estar de outras
          pessoas. A organização pode recusar entrada, remover participantes
          e cancelar contas sem reembolso em caso de violação grave.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Matches e contatos</h2>
        <p>
          Um match ocorre apenas quando há interesse mútuo na votação. O
          contato (ex.: WhatsApp) é liberado somente entre pares com match
          mútuo. Você autoriza o compartilhamento do telefone cadastrado com
          seus matches. Não use dados de contato de outros participantes para
          spam, assédio ou finalidades não consentidas.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Ingressos e pagamento</h2>
        <p>
          A compra de ingresso está sujeita à disponibilidade de vagas por
          gênero e às regras de <Link href="/reembolso">reembolso</Link>.
          Valores e horários são os indicados na página do evento no momento
          da compra.
        </p>
      </section>

      <section className="space-y-2">
        <h2>7. Limitação de responsabilidade</h2>
        <p>
          A SpeedDate BR não se responsabiliza por condutas de participantes
          fora do controle da organização, por interações após o evento nem
          por indisponibilidades temporárias da plataforma. Em qualquer caso,
          a responsabilidade da organização limita-se, no máximo, ao valor
          pago pelo ingresso do evento em questão.
        </p>
      </section>

      <section className="space-y-2">
        <h2>8. Alterações</h2>
        <p>
          Podemos atualizar estes termos periodicamente. O uso contínuo da
          plataforma após a publicação das alterações constitui aceitação da
          nova versão.
        </p>
      </section>
    </LegalPage>
  );
}
