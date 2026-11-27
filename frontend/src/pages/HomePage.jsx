import Icon from '../components/Icons';

const FEATURES = [
  {
    icon: 'notes',
    title: 'Notes et bulletins',
    text: 'Les notes par matière, les appréciations et les moyennes, puis le bulletin en PDF.',
  },
  {
    icon: 'absences',
    title: 'Absences et retards',
    text: "L'enseignant les saisit, le parent les justifie en ligne et reçoit une alerte.",
  },
  {
    icon: 'messages',
    title: 'Messagerie',
    text: "Messages et circulaires entre l'école et les familles, avec accusé de lecture.",
  },
  {
    icon: 'agenda',
    title: 'Emploi du temps et devoirs',
    text: 'Le planning de la semaine et le cahier de textes, publiés par les enseignants.',
  },
  {
    icon: 'autorisations',
    title: 'Autorisations et sorties',
    text: 'Les autorisations de sortie se signent directement en ligne par les parents.',
  },
  {
    icon: 'vie',
    title: 'Vie scolaire',
    text: 'Incidents, sanctions et récompenses suivis avec transparence.',
  },
];

const AUDIENCES = [
  { role: 'Élèves', tone: 'violet', text: 'Consultent leurs notes, leurs devoirs et leur emploi du temps.' },
  { role: 'Parents', tone: 'jaune', text: 'Suivent un ou plusieurs enfants, justifient les absences, échangent avec l’école et signent.' },
  { role: 'Enseignants', tone: 'rose', text: 'Saisissent notes, absences et devoirs pour leurs classes.' },
  { role: 'Administration', tone: 'vert', text: "Gère l'établissement et suit les statistiques." },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1>Le carnet de correspondance, sans le papier égaré.</h1>
          <p className="hero-lead">
            Notes, absences, messages, devoirs et autorisations de sortie : tout ce que l’école doit
            transmettre aux familles, lisible sur un téléphone comme sur un ordinateur.
          </p>
        </div>
      </section>

      <section className="section section-ruled" aria-labelledby="features-title">
        <div className="container">
          <h2 id="features-title">Tout ce que contient le carnet</h2>
          <ul className="feature-list">
            {FEATURES.map((f) => (
              <li key={f.title} className="feature">
                <span className="feature-icon">
                  <Icon name={f.icon} />
                </span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="audience-title">
        <div className="container">
          <h2 id="audience-title">Un espace pour chacun</h2>
          <ul className="tabs-grid">
            {AUDIENCES.map((a) => (
              <li key={a.role} className={`tab-card tone-${a.tone}`}>
                <h3>{a.role}</h3>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="privacy-band" aria-labelledby="privacy-title">
        <div className="container privacy">
          <span className="feature-icon feature-icon-light">
            <Icon name="shield" />
          </span>
          <div>
            <h2 id="privacy-title">Des données d’élèves protégées</h2>
            <p>
              Chaque personne ne voit que ce qui la concerne : un parent n’accède qu’aux informations de
              ses propres enfants. Les accès sont journalisés, car il s’agit de données de mineurs.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
