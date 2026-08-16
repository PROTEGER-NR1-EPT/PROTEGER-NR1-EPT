# Visão Geral do Produto

## Contexto

O PROTEGER-NR1 EPT é um sistema web para organização, registro e prevenção
de riscos psicossociais em instituições de Educação Profissional e
Tecnológica (EPT), desenvolvido como produto educacional de um mestrado
profissional na área.

A NR-1 (Norma Regulamentadora nº 1), atualizada para incluir riscos
psicossociais no Gerenciamento de Riscos Ocupacionais, exige que
organizações — incluindo instituições de ensino — identifiquem, registrem e
monitorem esses riscos. O sistema busca preencher essa lacuna, oferecendo
uma ferramenta digital replicável para qualquer instituição de ensino, não
apenas para o piloto inicial.

## Objetivo do sistema

Fornecer uma plataforma web que permita:

1. Coletar respostas anônimas de profissionais sobre riscos psicossociais,
   usando instrumentos validados (Karasek Demand-Control e COPSOQ).
2. Agregar e visualizar resultados por instituição/setor, respeitando
   limites de anonimato (k-anonimato).
3. Manter um registro de memória institucional vinculado a instituições
   cadastradas, permitindo histórico e acompanhamento ao longo do tempo.
4. Ser operável sem qualquer dependência de IA — recursos de LLM são
   opcionais e configuráveis por instituição/administrador.

## Módulos funcionais

O sistema é dividido em três módulos, alinhados ao produto educacional da
pesquisa:

1. **Identificação dos riscos** — aplicação de questionários (Karasek,
   COPSOQ) a profissionais, de forma anônima, via formulário público.
2. **Registro e memória institucional** — armazenamento de dados
   agregados, resultados e histórico vinculados a instituições
   cadastradas, para consulta por Consultores e Administradores.
3. **Formação pedagógica** — não é um módulo digital autônomo no MVP;
   corresponde a materiais pedagógicos (cartilhas, guias) distribuídos
   sob CC BY-NC-SA 4.0, fora do escopo técnico do software em si.

## Escopo do MVP (protótipo)

- Frontend web responsivo (mobile-first), sem necessidade de app nativo,
  incluindo uma página institucional pública (`/`) que apresenta o projeto
  (contexto, como funciona, privacidade, FAQ) separada do fluxo de
  resposta ao questionário propriamente dito (`/participar` em diante).
- Backend com API REST.
- Autenticação apenas para Consultor e Administrador — o Usuário final
  (respondente) nunca se autentica.
- Suporte a múltiplas instituições desde o início (não hardcoded para uma
  única instituição-piloto), viabilizando replicabilidade.
- Funcionalidades de IA (LLM) desligadas por padrão e totalmente
  opcionais.

## Fora de escopo (versões futuras)

- Suporte a LLM local (self-hosted).
- Aplicativo móvel nativo.
- Integração com sistemas de RH/folha de pagamento de terceiros.
