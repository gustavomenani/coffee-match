import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Regras do evento — SpeedDate BR",
  description:
    "Regras de check-in, respeito, votação e matches mútuos nos eventos SpeedDate BR.",
};

export default function RegrasPage() {
  return (
    <LegalPage
      eyebrow="Eventos"
      title="Regras do evento"
      subtitle="Leia antes de chegar — a noite funciona melhor quando todo mundo joga limpo."
    >
      <section className="space-y-2">
        <h2>1. 18+ e cadastro</h2>
        <p>
          Só entram maiores de 18 anos com cadastro completo e ingresso válido
          para a data. Leve documento com foto se a organização solicitar
          conferência de idade.
        </p>
      </section>

      <section className="space-y-2">
        <h2>2. Check-in</h2>
        <p>
          Chegue com antecedência. O check-in é feito no local com a equipe
          (ingresso pago e conta do app). Sem check-in, você não entra nas
          rodadas nem na votação. Atrasos podem reduzir o número de rodadas
          disponíveis.
        </p>
      </section>

      <section className="space-y-2">
        <h2>3. Respeito em primeiro lugar</h2>
        <p>
          Trate todas as pessoas com educação. Não force contato físico, não
          faça comentários ofensivos e não insista se alguém demonstrar
          desconforto. Assédio ou agressão resultam em remoção imediata sem
          reembolso e podem levar a banimento.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Rodadas</h2>
        <p>
          As conversas são cronometradas. Quando o sinal tocar, encerre com
          gentileza e siga a rotação indicada pela organização. Celulares
          devem ficar no silencioso durante as rodadas, salvo indicação em
          contrário para a votação.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Votação</h2>
        <p>
          Após as rodadas (ou conforme o fluxo da noite), vote no celular
          indicando com quem você tem interesse. Vote com honestidade: só
          marque quem você realmente gostaria de falar de novo. A votação
          tem horário de abertura e fechamento — votos fora da janela não
          contam.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Matches mútuos</h2>
        <p>
          Match só existe quando <strong>os dois</strong> se curtem. Interesse
          unilateral não libera contato. Os matches mútuos aparecem no app e o
          WhatsApp (ou telefone cadastrado) é compartilhado apenas entre o par.
        </p>
      </section>

      <section className="space-y-2">
        <h2>7. Depois da noite</h2>
        <p>
          Contato pós-evento deve continuar respeitoso. Se alguém pedir para
          parar, pare. A organização não media relacionamentos, mas pode
          bloquear contas em caso de denúncia de abuso.
        </p>
      </section>

      <section className="space-y-2">
        <h2>8. Documentos</h2>
        <p>
          Complementam estas regras os <Link href="/termos">Termos de uso</Link>{" "}
          e a <Link href="/reembolso">Política de reembolso</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
