# AssurGo - Plateforme de Gestion de Sinistres Intelligente

Bienvenue dans le dépôt du projet **AssurGo**. 

## 🤖 L'Intelligence Artificielle au Cœur d'AssurGo

Dans le projet AssurGo, l’intelligence artificielle joue un rôle central dans l’analyse intelligente des sinistres en se basant sur plusieurs sources de données stockées dans la base de données.

Chaque type de sinistre est associé à un document juridique général, ajouté et géré par l’administrateur. En parallèle, chaque utilisateur possède son propre contrat d’assurance. Lorsqu’un sinistre est déclaré, l’utilisateur fournit également des documents et éventuellement des images décrivant les dommages.

Le système d’intelligence artificielle exploite alors ces différentes informations de manière combinée. Il accède à la base de données pour analyser :
- Le contrat spécifique de l’utilisateur,
- Les documents juridiques généraux liés au type de sinistre,
- Les fichiers et images fournis lors de la déclaration.

Grâce à une approche basée sur le **RAG (Retrieval-Augmented Generation)**, l’IA recherche les informations les plus pertinentes dans ces documents, puis les utilise comme contexte pour générer une analyse précise.

En complément, un agent spécialisé analyse les images afin d’estimer le niveau de gravité des dommages. Les résultats de ces différentes analyses sont ensuite combinés pour produire :
- Une décision concernant la couverture du sinistre,
- Une estimation du montant d’indemnisation,
- Un score de confiance indiquant la fiabilité de la décision.

Ainsi, l’intelligence artificielle dans AssurGo ne se limite pas à une simple réponse, mais réalise une analyse complète et contextualisée basée sur des données réelles, permettant d’automatiser et d’optimiser le processus de gestion des sinistres.

En cas de faible niveau de confiance, la décision finale est transférée à un administrateur, garantissant ainsi un contrôle humain dans le système.