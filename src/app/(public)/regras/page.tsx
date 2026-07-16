import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regras do evento — SpeedDate BR",
  description:
    "Regras de check-in, respeito, votação e matches mútuos nos eventos SpeedDate BR.",
};

export default function RegrasPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-rose-600">
        Eventos
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        Regras do evento
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Leia antes de chegar — a noite funciona melhor quando todo mundo joga limpo.
      </p>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-700">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">1. 18+ e cadastro</h2>
          <p>
            Só entram maiores de 18 anos com cadastro completo e ingresso válido
            para a data. Leve documento com foto se a organização solicitar
            conferência de idade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">2. Check-in</h2>
          <p>
            Chegue com antecedência. O check-in é feito no local com a equipe
            (ingresso pago e conta do app). Sem check-in, você não entra nas
            rodadas nem na votação. Atrasos podem reduzir o número de rodadas
            disponíveis.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">3. Respeito em primeiro lugar</h2>
          <p>
            Trate todas as pessoas com educação. Não force contato físico, não
            faça comentários ofensivos e não insista se alguém demonstrar
            desconforto. Assédio ou agressão resultam em remoção imediata sem
            reembolso e podem levar a banimento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">4. Rodadas</h2>
          <p>
            As conversas são cronometradas. Quando o sinal tocar, encerre com
            gentileza e siga a rotação indicada pela organização. Celulares
            devem ficar no silencioso durante as rodadas, salvo indicação em
            contrário para a votação.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">5. Votação</h2>
          <p>
            Após as rodadas (ou conforme o fluxo da noite), vote no celular
            indicando com quem você tem interesse. Vote com honestidade: só
            marque quem você realmente gostaria de falar de novo. A votação
            tem horário de abertura e fechamento — votos fora da janela não
            contam.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">6. Matches mútuos</h2>
          <p>
            Match só existe quando <strong className="font-medium text-zinc-900">os dois</strong>{" "}
            se curtem. Interesse unilateral não libera contato. Os matches
            mútuos aparecem no app e o WhatsApp (ou telefone cadastrado) é
            compartilhado apenas entre o par.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">7. Depois da noite</h2>
          <p>
            Contato pós-evento deve continuar respeitoso. Se alguém pedir para
            parar, pare. A organização não media relacionamentos, mas pode
            bloquear contas em caso de denúncia de abuso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">8. Documentos</h2>
          <p>
            Complementam estas regras os{" "}
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
