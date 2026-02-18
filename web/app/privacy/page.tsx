export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 text-sm" style={{ color: '#444444' }}>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold" style={{ color: '#333333' }}>
          Política de Privacidade – Lado a Lado
        </h1>
        <p>
          Esta Política de Privacidade explica como o aplicativo <strong>Lado a Lado</strong> e
          sua página web de agendamentos tratam seus dados. Ao usar o app ou a página de
          agendamento, você concorda com os termos abaixo.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          1. Quem somos
        </h2>
        <p>
          Lado a Lado é um aplicativo para organizar visitas à maternidade e à casa após a
          chegada do bebê. A página web pública permite que convidados vejam horários
          disponíveis e façam suas reservas de visita.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          2. Quais dados coletamos
        </h2>
        <p>Podemos coletar e armazenar os seguintes tipos de dados:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Dados de conta</strong>: e-mail e senha usados para criar e acessar sua conta
            no app.
          </li>
          <li>
            <strong>Dados do bebê</strong>: nome e sexo do bebê, cadastrados por você no app.
          </li>
          <li>
            <strong>Dados das agendas de visita</strong>: título da agenda, datas, horários,
            quantidade de vagas por horário e código da agenda gerado pelo sistema.
          </li>
          <li>
            <strong>Dados dos visitantes</strong>: nome do visitante e número de pessoas para cada
            visita agendada via página web.
          </li>
          <li>
            <strong>Dados de assinatura</strong>: informações necessárias para gerenciar sua
            assinatura Premium (por meio do RevenueCat e das lojas de aplicativos, sem acesso
            direto aos dados completos de pagamento).
          </li>
          <li>
            <strong>Dados técnicos</strong>: endereço IP aproximado, tipo de dispositivo,
            navegador e informações técnicas semelhantes, coletadas automaticamente pelo provedor
            de backend e hospedagem (como Supabase e Vercel) para manter o serviço seguro e
            estável.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          3. Como usamos seus dados
        </h2>
        <p>Usamos os dados coletados para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>criar e manter sua conta no app;</li>
          <li>permitir o cadastro do bebê e a criação de agendas de visitas;</li>
          <li>
            gerar códigos e links que permitem que convidados acessem a página web de
            agendamento;
          </li>
          <li>
            registrar e exibir os horários de visita reservados (nome do visitante e número de
            pessoas) para quem criou a agenda;
          </li>
          <li>gerenciar e validar assinaturas Premium por meio do RevenueCat;</li>
          <li>melhorar a estabilidade, segurança e funcionamento do app e da página web.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          4. Compartilhamento de dados
        </h2>
        <p>
          Não vendemos seus dados pessoais. Seus dados podem ser compartilhados apenas com
          serviços essenciais para o funcionamento do app:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Supabase</strong>: serviço de banco de dados e autenticação usado para
            armazenar dados de conta, agendas, slots de visita e reservas.
          </li>
          <li>
            <strong>RevenueCat</strong>: serviço que gerencia assinaturas in-app e comunicação com
            a App Store.
          </li>
          <li>
            <strong>Serviços de hospedagem</strong> (por exemplo, Vercel): responsáveis por
            hospedar a página web pública.
          </li>
        </ul>
        <p>
          Esses serviços tratam os dados conforme seus próprios termos e políticas de
          privacidade.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          5. Acesso à página web e dados dos convidados
        </h2>
        <p>
          A página web de agendamento é acessada por meio de um link compartilhado por quem criou
          a agenda. Ao acessar esse link, convidados podem:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ver os horários disponíveis;</li>
          <li>informar seu nome e número de pessoas para reservar um horário;</li>
          <li>cancelar um agendamento feito anteriormente, informando o mesmo nome usado.</li>
        </ul>
        <p>
          Os dados de visitantes (nome e número de pessoas) ficam visíveis para quem criou a
          agenda dentro do app, para controle das visitas.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          6. Retenção e segurança dos dados
        </h2>
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa ou enquanto forem necessários para
          operar o serviço. Você pode excluir agendas e dados pelo app, e isso removerá as visitas
          associadas.
        </p>
        <p>
          Adotamos boas práticas técnicas para proteger seus dados, como conexão segura (HTTPS) e
          armazenamento em provedores com infraestrutura reconhecida. Ainda assim, nenhum sistema
          é 100% livre de riscos, e recomendamos que você mantenha seu dispositivo seguro.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          7. Seus direitos
        </h2>
        <p>
          Você pode, a qualquer momento, solicitar informações sobre os dados que mantemos sobre
          você, pedir correções ou solicitar a exclusão da sua conta e dados associados, conforme
          a legislação aplicável (como a LGPD no Brasil).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold" style={{ color: '#333333' }}>
          8. Contato
        </h2>
        <p>
          Em caso de dúvidas sobre esta Política de Privacidade, solicitações relacionadas aos
          seus dados ou suporte em geral, entre em contato pelo e-mail:{' '}
          <a href="mailto:fpachecosouza@icloud.com" className="underline">
            fpachecosouza@icloud.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-1">
        <p>Última atualização: fevereiro de 2026.</p>
      </section>
    </main>
  );
}

