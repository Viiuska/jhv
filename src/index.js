// chargement des librairies
import Phaser from "phaser";

/***********************************************************************/
/** CONFIGURATION GLOBALE DU JEU ET LANCEMENT 
/***********************************************************************/

// configuration générale du jeu
var config = {
  type: Phaser.AUTO,
  width: 800, // largeur en pixels
  height: 600, // hauteur en pixels
  physics: {
    // définition des parametres physiques
    default: "arcade", // mode arcade : le plus simple : des rectangles pour gérer les collisions. Pas de pentes
    arcade: {
      // parametres du mode arcade
      gravity: {
        y: 300 // gravité verticale : acceleration ddes corps en pixels par seconde
      },
      debug: false // permet de voir les hitbox et les vecteurs d'acceleration quand mis à true
    }
  },
  scene: {
    // une scene est un écran de jeu. Pour fonctionner il lui faut 3 fonctions  : create, preload, update
    preload: preload, // la phase preload est associée à la fonction preload, du meme nom (on aurait pu avoir un autre nom)
    create: create, // la phase create est associée à la fonction create, du meme nom (on aurait pu avoir un autre nom)
    update: update // la phase update est associée à la fonction update, du meme nom (on aurait pu avoir un autre nom)
  }
};

// création et lancement du jeu
new Phaser.Game(config);

/***********************************************************************/
/** VARIABLES GLOBALES 
/***********************************************************************/

var player; // désigne le sprite du joueur
var groupe_etoiles; // contient tous les sprite etoiles
var groupe_bombes; // contient tous les sprite bombes
var groupe_plateformes; // contient toutes les plateformes
var clavier; // pour la gestion du clavier
var score = 0; // pour enregistrer le score
var zone_texte_score; // pour afficher le score du joueur
var gameOver = false;

/***********************************************************************/
/** FONCTION PRELOAD 
/***********************************************************************/

/** La fonction preload est appelée une et une seule fois,
 * lors du chargement de la scene dans le jeu.
 * On y trouve surtout le chargement des assets (images, son ..)
 */
function preload() {
  // tous les assets du jeu sont placés dans le sous-répertoire src/assets/
  this.load.image("img_ciel", "src/assets/sky.png");
  this.load.image("img_plateforme", "src/assets/platform.png");
  this.load.image("img_etoile", "src/assets/star.png");
  this.load.image("img_bombe", "src/assets/bomb.png");
  this.load.spritesheet("img_perso", "src/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48
  });
}

/***********************************************************************/
/** FONCTION CREATE 
/***********************************************************************/

/* La fonction create est appelée lors du lancement de la scene
 * si on relance la scene, elle sera appelée a nouveau
 * on y trouve toutes les instructions permettant de créer la scene
 * placement des peronnages, des sprites, des platesformes, création des animations
 * ainsi que toutes les instructions permettant de planifier des evenements
 */
function create() {
  /*************************************
   *  CREATION DU MONDE + PLATEFORMES  *
   *************************************/

  // On ajoute une simple image de fond, le ciel, au centre de la zone affichée (400, 300)
  // Par défaut le point d'ancrage d'une image est le centre de cette derniere
  this.add.image(400, 300, "img_ciel");

  // la création d'un groupes permet de gérer simultanément les éléments d'une meme famille
  //  Le groupe groupe_plateformes contiendra le sol et deux platesformes sur lesquelles sauter
  // notez le mot clé "staticGroup" : le static indique que ces élements sont fixes : pas de gravite,
  // ni de possibilité de les pousser.
  groupe_plateformes = this.physics.add.staticGroup();
  // une fois le groupe créé, on va créer les platesformes , le sol, et les ajouter au groupe groupe_plateformes

  // l'image img_plateforme fait 400x32. On en met 2 à coté pour faire le sol
  // la méthode create permet de créer et d'ajouter automatiquement des objets à un groupe
  // on précise 2 parametres : chaque coordonnées et la texture de l'objet, et "voila!"
  groupe_plateformes.create(200, 584, "img_plateforme");
  groupe_plateformes.create(600, 584, "img_plateforme");

  //  on ajoute 3 platesformes flottantes
  groupe_plateformes.create(600, 450, "img_plateforme");
  groupe_plateformes.create(50, 300, "img_plateforme");
  groupe_plateformes.create(750, 270, "img_plateforme");

  /****************************
   *  CREATION DU PERSONNAGE  *
   ****************************/

  // On créée un nouveeau personnage : player
  player = this.physics.add.sprite(100, 450, "img_perso");

  //  propriétées physiqyes de l'objet player :
  player.setBounce(0.2); // on donne un petit coefficient de rebond
  player.setCollideWorldBounds(true); // le player se cognera contre les bords du monde

  /***************************
   *  CREATION DES ANIMATIONS *
   ****************************/
  // dans cette partie, on crée les animations, à partir des spritesheet
  // chaque animation est une succession de frame à vitesse de défilement défini
  // une animation doit avoir un nom. Quand on voudra la jouer sur un sprite, on utilisera la méthode play()
  // creation de l'animation "anim_tourne_gauche" qui sera jouée sur le player lorsque ce dernier tourne à gauche
  this.anims.create({
    key: "anim_tourne_gauche", // key est le nom de l'animation : doit etre unique poru la scene.
    frames: this.anims.generateFrameNumbers("img_perso", { start: 0, end: 3 }), // on prend toutes les frames de img perso numerotées de 0 à 3
    frameRate: 10, // vitesse de défilement des frames
    repeat: -1 // nombre de répétitions de l'animation. -1 = infini
  });

  // creation de l'animation "anim_tourne_face" qui sera jouée sur le player lorsque ce dernier n'avance pas.
  this.anims.create({
    key: "anim_face",
    frames: [{ key: "img_perso", frame: 4 }],
    frameRate: 20
  });

  // creation de l'animation "anim_tourne_droite" qui sera jouée sur le player lorsque ce dernier tourne à droite
  this.anims.create({
    key: "anim_tourne_droite",
    frames: this.anims.generateFrameNumbers("img_perso", { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });

  /***********************
   *  CREATION DU CLAVIER *
   ************************/
  // ceci permet de creer un clavier et de mapper des touches, connaitre l'état des touches
  clavier = this.input.keyboard.createCursorKeys();

  /*************************
   *  CREATION DES ETOILES  *
   **************************/

  //  On rajoute un groupe d'étoiles, vide pour l'instant
  groupe_etoiles = this.physics.add.group();
  // on rajoute 10 étoiles avec une boucle for :
  // on répartit les ajouts d'étoiles tous les 70 pixels sur l'axe des x
  for (var i = 0; i < 10; i++) {
    var coordX = 70 + 70 * i;
    groupe_etoiles.create(coordX, 10, "img_etoile");
  }

  // pour chaque étoile etoile_i du groupe, on va définir un coefficient de rebond aléatoire avec la méthode setBounceY
  // ceci s'ecrit bizarrement : avec un itérateur sur les enfants (children) du groupe (equivalent du for)
  // la fonction interateur va etre lancée pour chaque étoile ,designée ici par etoile_i a chaque tour de boucle
  groupe_etoiles.children.iterate(function iterateur(etoile_i) {
    // On tire un coefficient aléatoire de rerebond : valeur entre 0.4 et 0.8
    var coef_rebond = Phaser.Math.FloatBetween(0.4, 0.8);
    etoile_i.setBounceY(coef_rebond); // on attribut le coefficient de rebond à l'étoile etoile_i
  });

  /**************************************
   *  CREATION DES BOMBES (groupe vide) *
   *************************************/

  // on crée un groupe de bombes, vide au départ.
  // au fil du jeu, on ajoutera les bombes dans ce groupe
  groupe_bombes = this.physics.add.group();

  /*****************************
   *  ZONE D'AFFICHAGE DU SCORE *
   ******************************/

  //  On définit une zone de texte pour afficher le score en haut a gauche
  zone_texte_score = this.add.text(16, 16, "score: 0", {
    fontSize: "32px", // taille du texte
    fill: "#000" // couleur de texte
  });

  /*****************************************************
   *  GESTION DES INTERATIONS ENTRE  GROUPES ET ELEMENTS *
   ******************************************************/

  //  Collide the player and the groupe_etoiles with the groupe_plateformes
  this.physics.add.collider(player, groupe_plateformes);
  this.physics.add.collider(groupe_etoiles, groupe_plateformes);
  this.physics.add.collider(groupe_bombes, groupe_plateformes);

  // si le player marche sur un élément de groupe_étoiles (c.-à-d. une étoile) :
  // on déclenche la function callback "collecter_etoile" avec en parametres les
  // deux élement qui se sont superposés : le player, et l'étoile en question
  // les actions à entreprendre seront écrites dans la fonction ramasserEtoile
  this.physics.add.overlap(player, groupe_etoiles, ramasserEtoile, null, this);

  // meme chose avec le joueur et un élément de grouoe_bombres
  // ici avec comme fonction de callback chocAvecBombe
  this.physics.add.collider(player, groupe_bombes, chocAvecBombe, null, this);
}

/***********************************************************************/
/** FONCTION UPDATE 
/***********************************************************************/

function update() {
  if (gameOver) {
    return;
  }

  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play("anim_tourne_gauche", true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play("anim_tourne_droite", true);
  } else {
    player.setVelocityX(0);
    player.anims.play("anim_face");
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

/***********************************************************************/
/** FONCTION RAMASSERETOILE 
/***********************************************************************/

/* la fonction ramasserEtoile est une fonction de callBack :
 * elle est rappelée quand un player rencontre une étoile de groupe_etoile
 * a chaque appel, les parametres désignent le playet et l'étoile en question
 */
function ramasserEtoile(un_player, une_etoile) {
  // on désactive le "corps physique" de l'étoile mais aussi sa texture
  // l'étoile existe alors sans exister : elle est invisible et ne peut plus intéragir
  une_etoile.disableBody(true, true);

  //  on ajoute 10 points au score total, on met à jour l'affichage
  score += 10;
  zone_texte_score.setText("Score: " + score);

  // on regarde le nombre d'étoiles qui sont encore actives (non ramassées)
  if (groupe_etoiles.countActive(true) === 0) {
    // si ce nombre est égal à 0 : on va réactiver toutes les étoiles désactivées
    // pour chaque étoile etoile_i du groupe, on réacttive etoile_i avec la méthode enableBody
    // ceci s'ecrit bizarrement : avec un itérateur sur les enfants (children) du groupe (equivalent du for)
    groupe_etoiles.children.iterate(function iterateur(etoile_i) {
      etoile_i.enableBody(true, etoile_i.x, 0, true, true);
    });

    // on ajoute une nouvelle bombe au jeu
    // - on génère une nouvelle valeur x qui sera l'abcisse de la bombe

    var x;
    if (player.x < 400) {
      x = Phaser.Math.Between(400, 800);
    } else {
      x = Phaser.Math.Between(0, 400);
    }

    var bomb = groupe_bombes.create(x, 16, "img_bombe");
    bomb.setBounce(1);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    bomb.allowGravity = false;
  }
}

/***********************************************************************/
/** FONCTION CHOCAVECBOMBE 
/***********************************************************************/

function chocAvecBombe(un_player, une_bombe) {
  this.physics.pause();

  player.setTint(0xff0000);

  player.anims.play("anim_face");

  gameOver = true;
}
