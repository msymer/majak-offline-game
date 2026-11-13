// Journal pages (from 05_TAJNE.md, section 2.2). Pages 1–6 and 8 lie on the island after a boss;
// 7 is in the wreck of the siege tower (P-62), 9 is the chip of the dark Knot (P-61), 10 the letter of wave 99 (P-63).
export const PAGES = {
  1: { after: 10, text: 'Knote, jestli tohle čteš, nejsem doma. Neboj. Polévka je ve spíži, mazání v horním šuplíku. Mlha dnes přišla blíž než kdy dřív. Ti malí slizcí tvorové nejsou zlí. Jdou za světlem jako můry. Jen jich nesmí dojít moc, to by zhaslo.', sign: '– Hugo' },
  2: { after: 20, text: 'Ty plechové poznávám. Sám jsem je kdysi skládal a pak je odložil do kůlny. Na co člověk zapomene, to si mlha vezme. A pak to pošle zpátky trochu nakřivo.' },
  3: { after: 30, text: 'Poslední dobou zapomínám. Včera jsem hledal brýle a měl jsem je na nose. Dnes jsem si nemohl vzpomenout, jak se jmenuje naše kočka. Micka. Jmenuje se Micka. Zapsal jsem si to.' },
  4: { after: 40, text: 'Signál, Knote. Kdyby ses někdy ztratil ty mně nebo já tobě: tři dlouhá, jedno krátké. Znamená to: pojď domů. Paprsek jde otočit i rukou, stačí maják chvíli podržet.' },
  5: { after: 50, text: 'Za bránou je něco, co mi patřilo. Cítím to. Každé ráno mi kousek chybí a mlha je o kousek těžší. Myslím, že to spolu souvisí.' },
  6: { after: 60, text: 'Rozhodl jsem se. Půjdu si pro to, co mi mlha vzala. Ty hlídej světlo. Dokud svítí, trefím zpátky.' },
  7: { after: 70, note: 'Lístek přivázaný k lucerně.', text: 'Tohle je moje lucerna. Jestli ji někdo najde: nesl jsem ji, dokud jsem věděl, kam jdu.' },
  8: { after: 80, note: 'Písmo se třese.', text: 'Je tu tma a spousta věcí, které někdo míval rád. Hraček. Písniček. Jmen. Nevím, které z nich je moje.', shaky: true },
  9: { after: 90, mono: true, text: 'ZÁZNAM 0001. Starý pán mě vytáhl z mlhy. Byl jsem rozbitý. Řekl: „Na tebe taky někdo zapomněl, viď? Tak my dva si budeme pamatovat navzájem.“ Dal mi jméno Knot. Prý proto, že držím plamen.' },
  10: {
    after: 99, label: 99,
    text: 'Knote. Už nevím, kdo tohle píše. Vím jen, že někde svítí světlo a že k němu mám jít. Jestli přijdu jako někdo jiný, zasviť mi. Tři dlouhá. Jedno krátké.',
    // the torn page (the messenger did not make it): the words "zasviť mi" and "jedno krátké" are missing
    torn: 'Knote. Už nevím, kdo tohle píše. Vím jen, že někde svítí světlo a že k němu mám jít. Jestli přijdu jako někdo jiný, ░░░░░ ░░. Tři dlouhá. ░░░░░ ░░░░░░.',
  },
};

export const PAGE_COUNT = 10;
