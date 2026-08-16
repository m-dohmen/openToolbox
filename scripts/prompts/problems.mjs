// SPDX-License-Identifier: Apache-2.0
/**
 * Die Problembeschreibung je Demo, in den Sprachen der generierten Prompts.
 *
 * Das ist der eine Abschnitt, der sich nicht aus dem Schema ableiten lässt: das
 * Schema sagt, *was* gebaut wird, nicht *warum*. Und ohne das Warum baut ein
 * Agent zwar dieselben Felder, trifft aber jede Ermessensfrage anders.
 *
 * Bewusst kurz gehalten - zwei bis vier Sätze. Ausführlich steht es auf der
 * Startseite der jeweiligen Demo, die der Prompt ohnehin wörtlich mitliefert.
 */

export const PROBLEMS = {
  portfolio: {
    en:
      'A consultancy runs several client engagements at once. Each has a budget, a lead, a phase and ' +
      'milestones that belong to it. The recurring question in every steering meeting is whether the ' +
      'engagement is still inside its budget — and the answer is usually assembled by hand from a ' +
      'spreadsheet nobody trusts.',
    de:
      'Eine Beratung führt mehrere Kundenprojekte gleichzeitig. Jedes hat Budget, Verantwortliche, ' +
      'Phase und Meilensteine, die dazugehören. Die Frage in jedem Lenkungsausschuss ist, ob das ' +
      'Projekt noch im Budget liegt — und die Antwort wird meist von Hand aus einer Tabelle ' +
      'zusammengesucht, der niemand traut.',
    es:
      'Una consultora lleva varios proyectos de cliente a la vez. Cada uno tiene presupuesto, ' +
      'responsable, fase e hitos que le pertenecen. La pregunta que se repite en cada comité es si ' +
      'el proyecto sigue dentro de presupuesto, y la respuesta suele armarse a mano desde una hoja ' +
      'de cálculo en la que nadie confía.',
    fr:
      'Un cabinet mène plusieurs missions clients en parallèle. Chacune a un budget, un responsable, ' +
      'une phase et des jalons qui lui appartiennent. La question qui revient à chaque comité de ' +
      'pilotage est de savoir si la mission tient encore dans son budget — et la réponse est ' +
      'généralement reconstituée à la main depuis un tableur auquel personne ne se fie.',
    pt:
      'Uma consultoria toca vários projetos de cliente ao mesmo tempo. Cada um tem orçamento, ' +
      'responsável, fase e marcos que lhe pertencem. A pergunta que se repete em todo comitê é se o ' +
      'projeto ainda cabe no orçamento — e a resposta costuma ser montada à mão a partir de uma ' +
      'planilha em que ninguém confia.',
    zh:
      '一家咨询公司同时在做多个客户项目。每个项目都有预算、负责人、阶段，以及归属于它的里程碑。每次指导' +
      '委员会上反复出现的问题是：这个项目还在预算之内吗？而答案通常是从一张没人信得过的表格里手工拼出来的。',
    ja:
      'コンサルティング会社が複数の顧客案件を並行して進めています。案件ごとに予算・責任者・フェーズがあり、' +
      'そこに紐づくマイルストーンがあります。ステアリング会議で毎回出るのは「まだ予算内か」という問いで、' +
      'その答えはたいてい、誰も信用していない表計算から手作業で組み立てられます。',
  },

  'ppwr-packaging': {
    en:
      'From 12 August 2026 the EU packaging regulation (PPWR) requires a declaration of conformity ' +
      'and technical documentation **for every packaging placed on the market**. A corporation has a ' +
      'department for that. A small manufacturer with forty articles has the owner — who then finds ' +
      'that the decisive figures are not hers at all: they sit with the box supplier, the label ' +
      'printer and the film manufacturer. This is a data-collection problem, not a software problem. ' +
      'The tool has to make visible what is still missing and where it has to come from.',
    de:
      'Ab dem 12. August 2026 verlangt die EU-Verpackungsverordnung (PPWR) eine ' +
      'Konformitätserklärung und technische Dokumentation **für jede in Verkehr gebrachte ' +
      'Verpackung**. Ein Konzern hat dafür eine Abteilung. Die Manufaktur mit vierzig Artikeln hat ' +
      'die Inhaberin — die dann feststellt, dass die entscheidenden Angaben gar nicht bei ihr ' +
      'liegen, sondern beim Kartonlieferanten, der Etikettendruckerei und dem Folienhersteller. Das ' +
      'ist ein Erhebungsproblem, kein Softwareproblem. Das Werkzeug muss sichtbar machen, was noch ' +
      'fehlt und woher es kommen muss.',
    es:
      'Desde el 12 de agosto de 2026 el reglamento europeo de envases (PPWR) exige una declaración ' +
      'de conformidad y documentación técnica **para cada envase puesto en el mercado**. Una gran ' +
      'empresa tiene un departamento para eso. Un taller con cuarenta artículos tiene a su dueña — ' +
      'que descubre que los datos decisivos no son suyos: están en el proveedor de cartón, la ' +
      'imprenta de etiquetas y el fabricante de film. Es un problema de recopilación, no de ' +
      'software. La herramienta debe mostrar qué falta y de dónde tiene que venir.',
    fr:
      'À partir du 12 août 2026, le règlement européen sur les emballages (PPWR) exige une ' +
      'déclaration de conformité et une documentation technique **pour chaque emballage mis sur le ' +
      'marché**. Un grand groupe a un service pour cela. Une petite fabrication de quarante articles ' +
      'a sa dirigeante — qui découvre que les données décisives ne sont pas chez elle : elles sont ' +
      'chez le cartonnier, l’imprimeur d’étiquettes et le fabricant de film. C’est un problème de ' +
      'collecte, pas de logiciel. L’outil doit rendre visible ce qui manque et d’où cela doit venir.',
    pt:
      'A partir de 12 de agosto de 2026 o regulamento europeu de embalagens (PPWR) exige uma ' +
      'declaração de conformidade e documentação técnica **para cada embalagem colocada no ' +
      'mercado**. Uma corporação tem um departamento para isso. Um pequeno fabricante com quarenta ' +
      'artigos tem a própria dona — que então descobre que os dados decisivos não são dela: estão ' +
      'com o fornecedor de papelão, a gráfica de etiquetas e o fabricante do filme. É um problema ' +
      'de coleta, não de software. A ferramenta precisa tornar visível o que ainda falta e de onde ' +
      'tem de vir.',
    zh:
      '自 2026 年 8 月 12 日起，欧盟包装法规（PPWR）要求**每一种投放市场的包装**都要有符合性声明和技术文档。' +
      '大企业有专门部门来做这件事；只有四十个品项的小作坊，做这件事的是老板本人 —— 然后她发现，关键数据根本' +
      '不在自己手里，而在纸箱供应商、标签印刷厂和薄膜厂那里。这是一个数据收集问题，不是软件问题。工具要做的，' +
      '是让「还缺什么、该向谁要」一眼可见。',
    ja:
      '2026 年 8 月 12 日から、EU の包装規則（PPWR）は**市場に出すすべての包装**について適合宣言と技術文書を' +
      '求めます。大企業には担当部署があります。品目 40 点の小さな製造者にとって、それをやるのは経営者本人です。' +
      'そして気づきます。決め手になる数値は自社にはなく、段ボール業者・ラベル印刷業者・フィルムメーカーの側に' +
      'あるのだと。これはソフトウェアの問題ではなく、情報収集の問題です。ツールの役目は、何がまだ足りず、' +
      'それを誰から得るべきかを見えるようにすることです。',
  },

  'gdpr-processing': {
    en:
      'Under Art. 30 GDPR almost every company must keep a register of processing activities. Almost ' +
      'none keeps one worth the name, and the reason is rarely unwillingness — it is collection. The ' +
      'answers sit with twelve different people: the application files with HR, the newsletter tool ' +
      'with marketing, the camera system with the caretaker. Whoever tries to fill it in centrally ' +
      'writes twelve emails and gets nine replies. The tool therefore has to work as something you ' +
      'send out: each department reports its own processing, saves, sends it back.',
    de:
      'Nach Art. 30 DSGVO muss fast jedes Unternehmen ein Verzeichnis von Verarbeitungstätigkeiten ' +
      'führen. Fast keines führt eines, das den Namen verdient, und der Grund ist selten Unwille — ' +
      'es ist die Erhebung. Die Antworten liegen bei zwölf verschiedenen Leuten: die ' +
      'Bewerbungsmappen bei der Personalstelle, das Newsletter-Werkzeug im Marketing, die ' +
      'Videoanlage beim Hausmeister. Wer das zentral ausfüllen will, schreibt zwölf Mails und ' +
      'bekommt neun Antworten. Das Werkzeug muss deshalb als etwas funktionieren, das man ' +
      'verschickt: jeder Bereich meldet seine eigene Verarbeitung, speichert, schickt zurück.',
    es:
      'Según el art. 30 del RGPD casi toda empresa debe llevar un registro de actividades de ' +
      'tratamiento. Casi ninguna lleva uno que merezca ese nombre, y el motivo rara vez es mala ' +
      'voluntad: es la recopilación. Las respuestas están en doce personas distintas: las ' +
      'candidaturas en RR. HH., la herramienta de newsletter en marketing, las cámaras con el ' +
      'conserje. Quien intente rellenarlo desde el centro escribe doce correos y recibe nueve. Por ' +
      'eso la herramienta tiene que funcionar como algo que se envía: cada área declara su propio ' +
      'tratamiento, guarda y lo devuelve.',
    fr:
      'Selon l’art. 30 du RGPD, presque toute entreprise doit tenir un registre des activités de ' +
      'traitement. Presque aucune n’en tient un digne de ce nom, et la raison est rarement la ' +
      'mauvaise volonté : c’est la collecte. Les réponses sont chez douze personnes différentes : ' +
      'les candidatures aux RH, l’outil de newsletter au marketing, la vidéosurveillance chez le ' +
      'gardien. Qui veut le remplir depuis le centre écrit douze courriels et en reçoit neuf. ' +
      'L’outil doit donc fonctionner comme quelque chose qu’on envoie : chaque service déclare son ' +
      'propre traitement, enregistre, renvoie.',
    pt:
      'Pelo art. 30 do RGPD quase toda empresa precisa manter um registro de atividades de ' +
      'tratamento. Quase nenhuma mantém um que mereça o nome, e o motivo raramente é má vontade — é ' +
      'a coleta. As respostas estão com doze pessoas diferentes: as candidaturas no RH, a ferramenta ' +
      'de newsletter no marketing, as câmeras com o zelador. Quem tenta preencher de forma central ' +
      'escreve doze e-mails e recebe nove. Por isso a ferramenta precisa funcionar como algo que se ' +
      'envia: cada área declara o próprio tratamento, salva e devolve.',
    zh:
      '按 GDPR 第 30 条，几乎每家企业都必须建立处理活动记录。几乎没有一家真正建得起来 —— 原因很少是不愿意，' +
      '而是收集。答案分散在十二个人手里：求职材料在人事，邮件订阅工具在市场，监控系统在物业。想在中心统一填写的人，' +
      '发出十二封邮件，收回九封。因此这个工具必须能被「发出去」：每个部门填报自己的处理活动，保存，寄回。',
    ja:
      'GDPR 第 30 条により、ほぼすべての企業が処理活動の記録を備えなければなりません。しかし名に値するものを' +
      '備えている企業はほとんどありません。理由は多くの場合、やる気ではなく収集にあります。答えは 12 人の手元に' +
      '散らばっています。応募書類は人事、メール配信ツールは広報、防犯カメラは管理人。中央で埋めようとすれば、' +
      'メールを 12 通出して 9 通返ってきます。だからこのツールは「送って回すもの」として成立する必要があります。' +
      '各部門が自分の処理を申告し、保存し、送り返す。',
  },

  'equipment-testing': {
    en:
      'Every workshop, trade business and childcare centre has equipment that must be tested at ' +
      'regular intervals — the drill, the extension lead, the coffee machine, the heat gun. The test ' +
      'itself takes minutes. The administration eats the afternoon, because the protocol sits in a ' +
      'binder, the intervals sit in the foreman’s head, and after an accident the accident insurer ' +
      'asks exactly one question: **when was this device last tested?**',
    de:
      'Jede Werkstatt, jeder Handwerksbetrieb, jede Kita hat Geräte, die in festen Abständen geprüft ' +
      'werden müssen — Bohrmaschine, Verlängerung, Kaffeemaschine, Heißluftgebläse. Die Prüfung ' +
      'selbst dauert Minuten. Die Verwaltung frisst den Nachmittag, weil das Protokoll im Ordner ' +
      'liegt, die Fristen im Kopf des Meisters, und die Berufsgenossenschaft nach einem Unfall genau ' +
      'eine Frage stellt: **wann wurde dieses Gerät zuletzt geprüft?**',
    es:
      'Todo taller, toda empresa artesanal y toda guardería tiene equipos que deben revisarse a ' +
      'intervalos fijos: el taladro, el alargador, la cafetera, la pistola de calor. La revisión ' +
      'dura minutos. La administración se come la tarde, porque el acta está en una carpeta, los ' +
      'plazos en la cabeza del encargado, y tras un accidente la mutua hace exactamente una ' +
      'pregunta: **¿cuándo se revisó este aparato por última vez?**',
    fr:
      'Chaque atelier, chaque entreprise artisanale, chaque crèche possède des appareils à contrôler ' +
      'à intervalles réguliers : la perceuse, la rallonge, la machine à café, le décapeur ' +
      'thermique. Le contrôle prend quelques minutes. L’administration engloutit l’après-midi, ' +
      'parce que le procès-verbal dort dans un classeur, les échéances dans la tête du chef, et ' +
      'qu’après un accident l’assureur pose exactement une question : **quand cet appareil a-t-il ' +
      'été contrôlé pour la dernière fois ?**',
    pt:
      'Toda oficina, toda empresa de ofício e toda creche tem equipamentos que precisam ser testados ' +
      'em intervalos fixos: a furadeira, a extensão, a cafeteira, o soprador térmico. O teste em si ' +
      'leva minutos. A administração consome a tarde, porque o laudo está numa pasta, os prazos na ' +
      'cabeça do encarregado, e depois de um acidente o seguro faz exatamente uma pergunta: ' +
      '**quando este aparelho foi testado pela última vez?**',
    zh:
      '每一间车间、每一家手工业企业、每一所托儿所，都有必须按固定周期检验的设备 —— 电钻、接线板、咖啡机、热风枪。' +
      '检验本身只要几分钟，管理却要耗掉一个下午：检验记录在文件夹里，周期在师傅脑子里。而事故发生后，' +
      '工伤保险机构只问一个问题：**这台设备上一次是什么时候检验的？**',
    ja:
      'どの工場も、どの職人企業も、どの保育施設も、一定間隔で点検しなければならない機器を持っています。' +
      'ドリル、延長コード、コーヒーメーカー、ヒートガン。点検そのものは数分です。ところが管理が午後を丸ごと' +
      '食いつぶします。記録はバインダーの中、期限は親方の頭の中。そして事故のあと、労災保険はただ一つ聞きます。' +
      '**この機器を最後に点検したのはいつですか。**',
  },

  'renovation-quotes': {
    en:
      'Someone renovates a house. For each trade they collect three quotes: one never arrives, one ' +
      'is twice what they expected, and three months later nobody remembers why they went with the ' +
      'middle one. In the end comes the question every client asks too late: **are we still inside ' +
      'the budget?** The same shape as a project portfolio, but private, and with binding periods ' +
      'that quietly expire.',
    de:
      'Jemand saniert ein Haus. Für jedes Gewerk holt er drei Angebote ein: eines kommt nie, eines ' +
      'ist doppelt so teuer wie gedacht, und drei Monate später weiß niemand mehr, warum die Wahl ' +
      'auf das mittlere fiel. Am Ende steht die Frage, die jeder Bauherr zu spät stellt: **sind wir ' +
      'noch im Budget?** Dieselbe Form wie ein Projektportfolio, nur privat — und mit Bindefristen, ' +
      'die still ablaufen.',
    es:
      'Alguien reforma una casa. Para cada gremio pide tres presupuestos: uno no llega nunca, otro ' +
      'cuesta el doble de lo previsto, y tres meses después nadie recuerda por qué se eligió el del ' +
      'medio. Al final llega la pregunta que todo promotor hace tarde: **¿seguimos dentro del ' +
      'presupuesto?** La misma forma que una cartera de proyectos, pero privada, y con plazos de ' +
      'validez que vencen en silencio.',
    fr:
      'Quelqu’un rénove une maison. Pour chaque corps de métier il demande trois devis : l’un ' +
      'n’arrive jamais, l’autre coûte le double du prévu, et trois mois plus tard personne ne se ' +
      'souvient pourquoi on a retenu celui du milieu. À la fin vient la question que tout maître ' +
      'd’ouvrage pose trop tard : **sommes-nous encore dans le budget ?** La même forme qu’un ' +
      'portefeuille de projets, mais privée, et avec des délais de validité qui expirent en silence.',
    pt:
      'Alguém reforma uma casa. Para cada serviço pede três orçamentos: um nunca chega, outro custa ' +
      'o dobro do esperado, e três meses depois ninguém lembra por que ficaram com o do meio. No ' +
      'fim vem a pergunta que todo dono de obra faz tarde demais: **ainda estamos dentro do ' +
      'orçamento?** A mesma forma de uma carteira de projetos, só que privada — e com prazos de ' +
      'validade que vencem em silêncio.',
    zh:
      '有人在翻修房子。每个工种都问三家报价：一家永远不回，一家贵得离谱，三个月后没人记得当初为什么选了中间那家。' +
      '最后浮出那个所有业主都问得太晚的问题：**我们还在预算内吗？** 结构和项目组合是一样的，只是发生在私人生活里，' +
      '而且多了会悄悄过期的报价有效期。',
    ja:
      'ある人が家を改修しています。工種ごとに 3 社から見積もりを取る。1 社は永遠に返ってこない。1 社は想定の倍。' +
      'そして 3 か月後、なぜ真ん中の 1 社に決めたのか誰も覚えていない。最後に、すべての施主が手遅れになってから' +
      '尋ねる問いが来ます。**まだ予算内か。** 案件ポートフォリオと同じ構造ですが、こちらは私生活の話で、' +
      'しかも静かに切れていく見積有効期限があります。',
  },

  'school-trip': {
    en:
      'A class trip is coming up. 28 forms go out, 19 come back, three without a signature, one with ' +
      'an allergy written on the back. Two days before departure the money from four families is ' +
      'still missing. The class teacher keeps this in a sheet she is not allowed to share, because ' +
      'allergies and swimming ability are in it. Almost nothing here is a number — it is a set of ' +
      'states, and the only sum that matters is what is still outstanding.',
    de:
      'Eine Klassenfahrt steht an. 28 Zettel gehen raus, 19 kommen zurück, drei ohne Unterschrift, ' +
      'einer mit einer Allergie auf der Rückseite. Zwei Tage vor Abfahrt fehlt das Geld von vier ' +
      'Familien. Die Klassenlehrerin führt das in einer Tabelle, die sie nicht teilen darf, weil ' +
      'Allergien und Schwimmfähigkeit darin stehen. Fast nichts daran ist eine Zahl — es sind ' +
      'Zustände, und die einzige Summe, auf die es ankommt, ist der offene Rest.',
    es:
      'Se acerca un viaje de fin de curso. Salen 28 autorizaciones, vuelven 19, tres sin firma, una ' +
      'con una alergia anotada al dorso. Dos días antes de salir falta el dinero de cuatro familias. ' +
      'La tutora lo lleva en una hoja que no puede compartir, porque contiene alergias y si el niño ' +
      'sabe nadar. Casi nada de esto es un número: son estados, y la única suma que importa es lo ' +
      'que queda pendiente.',
    fr:
      'Un voyage scolaire approche. 28 autorisations partent, 19 reviennent, trois sans signature, ' +
      'une avec une allergie notée au dos. Deux jours avant le départ, l’argent de quatre familles ' +
      'manque encore. L’enseignante tient cela dans un tableau qu’elle n’a pas le droit de ' +
      'partager, parce qu’il contient des allergies et le niveau de natation. Presque rien ici n’est ' +
      'un nombre : ce sont des états, et la seule somme qui compte est le reste dû.',
    pt:
      'Uma excursão escolar se aproxima. Saem 28 autorizações, voltam 19, três sem assinatura, uma ' +
      'com uma alergia anotada no verso. Dois dias antes da partida falta o dinheiro de quatro ' +
      'famílias. A professora mantém isso numa planilha que não pode compartilhar, porque contém ' +
      'alergias e se a criança sabe nadar. Quase nada aqui é número: são estados, e a única soma ' +
      'que importa é o que ainda falta pagar.',
    zh:
      '班级要出游了。发出去 28 张回执，收回 19 张，其中三张没签名，一张在背面写着过敏情况。出发前两天，' +
      '还有四个家庭的钱没交。班主任把这些记在一张不能给别人看的表里 —— 因为里面写着过敏和会不会游泳。' +
      '这里几乎没有什么是数字，全是状态；唯一要紧的求和，是还差多少钱。',
    ja:
      '校外学習が近づいています。28 枚の用紙を配り、19 枚が戻り、うち 3 枚は署名なし、1 枚は裏にアレルギーが' +
      '書かれています。出発 2 日前になっても 4 家庭からの集金が終わりません。担任はこれを、共有できない表で' +
      '管理しています。アレルギーや泳力が書かれているからです。ここにはほとんど数値がありません。' +
      'あるのは状態で、意味のある合計は「あといくら足りないか」だけです。',
  },
}
