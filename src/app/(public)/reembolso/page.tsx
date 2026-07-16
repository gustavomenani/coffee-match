import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Política de reembolso — SpeedDate BR",
  description:
    "Quando e como solicitar reembolso de ingressos SpeedDate BR.",
};

export default function ReembolsoPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      subtitle="Última atualização: julho de 2026"
    >
      <section className="space-y-2">
        <h2>1. Resumo</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Reembolso possível se solicitado{" "}
            <strong>até 48 horas antes</strong> do início do evento e{" "}
            <strong>sem check-in</strong>.
          </li>
          <li>
            <strong>Sem reembolso após o check-in</strong>, mesmo que você
            saia mais cedo.
          </li>
          <li>
            O organizador pode remarcar ou cancelar o evento; nesses casos,
            oferecemos crédito, remarcação ou reembolso conforme a seção 4.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>2. Cancelamento pelo participante</h2>
        <p>
          Você pode pedir reembolso integral do valor do ingresso se a
          solicitação for feita com no mínimo 48 horas de antecedência em
          relação ao horário de início publicado e se o check-in ainda não
          tiver sido realizado. Pedidos feitos com menos de 48 horas ou após
          o check-in não são elegíveis a reembolso, salvo decisão excepcional
          da organização.
        </p>
      </section>

      <section className="space-y-2">
        <h2>3. Após o check-in</h2>
        <p>
          O check-in confirma sua participação na noite. A partir desse
          momento o ingresso é considerado utilizado: não há reembolso nem
          transferência automática para outra data.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Remarcação ou cancelamento pelo organizador</h2>
        <p>
          Se a organização remarcar o evento, seu ingresso permanece válido
          para a nova data (ou você pode solicitar reembolso se a nova data
          não for conveniente). Se o evento for cancelado sem remarcação,
          devolvemos o valor pago pelo ingresso nos mesmos meios utilizados
          no pagamento, em prazo razoável conforme o processador.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Como solicitar</h2>
        <p>
          Entre em contato pelo canal de suporte indicado no site ou no
          e-mail de confirmação da compra, informando o e-mail da conta e o
          evento. Processamos pedidos elegíveis o mais rápido possível;
          prazos bancários e do gateway de pagamento podem variar.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Conduta e remoção</h2>
        <p>
          Participantes removidos por violação das{" "}
          <Link href="/regras">regras do evento</Link> ou dos{" "}
          <Link href="/termos">termos de uso</Link> não têm direito a
          reembolso.
        </p>
      </section>
    </LegalPage>
  );
}
