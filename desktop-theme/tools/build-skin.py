"""Builds PS3-XMB/skin.json from Glass Dusk's skin.json (tools/skin.glass-dusk.json).

Every Glass Dusk setting is kept with the same option files; names, values and descriptions
are translated to French, and a "PS3" tab is added. Run: python tools/build-skin.py
"""
import json
from pathlib import Path

THEME = Path(__file__).resolve().parent.parent / "PS3-XMB"
source = json.loads((Path(__file__).resolve().parent / "skin.glass-dusk.json").read_text(encoding="utf-8"))

TABS = {"Look": "Apparence", "Library": "Bibliothèque", "Big Picture & overlay": "Big Picture et overlay", "Plugins": "Plugins"}
YES_NO = {"yes": "yes", "no": "no"}  # Millennium draws yes/no as a checkbox: keep them as is.

# Glass Dusk setting -> (French name, French description, {English value: French value})
FR = {
    "Wallet balance": ("Solde du portefeuille", "Le solde dans la barre du haut. Flouté, il apparaît au survol.", {"Show": "Afficher", "Blur until hover": "Flou jusqu'au survol"}),
    "Theme language": ("Langue du thème", "Textes dessinés par le thème : en-tête de l'accueil, puce Big Picture, dates.", {"English": "English", "Українська": "Українська", "Français": "Français"}),
    "Background": ("Arrière-plan", "Ce qui se trouve derrière le verre. Avec le fond PS3, « Art du jeu » pose l'art du jeu ouvert sur la couleur PS3 ; « Crépuscule uni » laisse la couleur PS3 et la vague seules.", {"Game art": "Art du jeu", "Meadow": "Prairie", "Plain dusk": "Crépuscule uni"}),
    "Background art": ("Intensité de l'art", "Force de l'art du jeu à travers le verre.", {"Normal": "Normale", "Subtle": "Discrète", "Vivid": "Vive"}),
    "Accent colour": ("Couleur d'accent", "Couleur des boutons et surbrillances. Art du jeu : les couleurs du jeu affiché. Fixe : l'accent de l'onglet Couleurs. (Voir aussi PS3 → Accent.)", {"Game art": "Art du jeu", "Fixed": "Fixe"}),
    "Accent style": ("Style d'accent", "Bicolore : une deuxième couleur tirée de l'art, proche de la première, en dégradé sur les boutons principaux et les barres. Unie : une seule couleur.", {"Two-tone": "Bicolore", "Solid": "Unie"}),
    "Glass": ("Verre", "Transparence des panneaux.", {"Normal": "Normal", "Denser": "Plus dense", "Sheerer": "Plus clair"}),
    "Glass finish": ("Finition du verre", "Surface des panneaux : grain fin et bords éclairés par l'accent, ou verre lisse.", {"Grain and lit edge": "Grain et bord éclairé", "Grain": "Grain", "Lit edge": "Bord éclairé", "Plain": "Lisse"}),
    "Corners": ("Coins", "Arrondi des panneaux et des cartes.", {"Normal": "Normaux", "Softer": "Plus doux", "Sharper": "Plus vifs"}),
    "Transitions": ("Transitions", "En ouvrant un autre jeu, l'accent glisse vers la nouvelle couleur et l'art se fond. Instantanées : tout change d'un coup (et la vague PS3 animée s'arrête).", {"Flowing": "Fluides", "Instant": "Instantanées"}),
    "Sign-in screen": ("Écran de connexion", "Le choix du compte au démarrage de Steam (« Qui joue ? »).", {"Game art": "Art du jeu", "Your games": "Vos jeux", "Slideshow": "Diaporama", "Dusk": "Crépuscule", "Steam's wall": "Mur de Steam", "Steam": "Steam"}),
    "When idle": ("En veille", "Laissé seul sur la bibliothèque, Steam devient l'art du jeu affiché, avec son logo, l'heure et la date.", {"After 5 minutes": "Après 5 minutes", "After 2 minutes": "Après 2 minutes", "After 15 minutes": "Après 15 minutes", "Never": "Jamais"}),
    "Library home": ("Accueil de la bibliothèque", "L'en-tête du thème (salutation, statistiques, Continuer) ou seulement les étagères de Steam.", {"Theme": "Thème", "Steam": "Steam"}),
    "Home number: Games": ("Accueil : nombre de jeux", "Tous les jeux de la bibliothèque, installés ou non.", YES_NO),
    "Home number: Hours played": ("Accueil : heures jouées", "Heures sur toute la bibliothèque.", YES_NO),
    "Home number: Hours, 2 weeks": ("Accueil : heures sur 2 semaines", "Heures jouées ces deux dernières semaines.", YES_NO),
    "Home number: Unplayed": ("Accueil : jamais lancés", "Jeux jamais démarrés.", YES_NO),
    "Home number: Perfect games": ("Accueil : jeux parfaits", "Jeux avec tous les succès débloqués.", YES_NO),
    "Home number: On disk": ("Accueil : espace disque", "Espace occupé par les bibliothèques Steam, en Go.", YES_NO),
    "Home numbers: second line": ("Accueil : deuxième ligne", "Une petite ligne sous chaque nombre : installés, dans combien de jeux, complétion moyenne, disques.", YES_NO),
    "Home: two weeks in colour": ("Accueil : deux semaines en couleur", "Une barre sous la salutation : chaque jeu joué ces deux semaines, à sa part d'heures et dans ses couleurs.", YES_NO),
    "Recently played shelf": ("Étagère « Joué récemment »", "La rangée des jeux récents sous la carte Continuer.", YES_NO),
    "Recently played: preview": ("Joué récemment : aperçu", "Au survol d'une jaquette : captures, nom et heures du jeu.", YES_NO),
    "Home games": ("Jeux de l'accueil", "D'où viennent Continuer et la rangée récente : jeux installés ou toute la bibliothèque.", {"Installed": "Installés", "Whole library": "Toute la bibliothèque"}),
    "Continue card: achievements": ("Carte Continuer : succès", "Progression des succès du jeu de la carte Continuer.", YES_NO),
    "What's New shelf": ("Étagère « Quoi de neuf »", "L'étagère Quoi de neuf de Steam sur l'accueil.", YES_NO),
    "Add shelf button": ("Bouton « Ajouter une étagère »", "La rangée de Steam pour ajouter une étagère.", YES_NO),
    "Game list side": ("Côté de la liste des jeux", "Où se place la liste des jeux.", {"Right": "Droite", "Left": "Gauche"}),
    "Game page: collection tags": ("Page du jeu : collections", "Les collections du jeu, en haut à droite de son art. Un clic ouvre la collection.", YES_NO),
    "Store: game list": ("Magasin : liste des jeux", "Votre liste de jeux à côté du magasin : désactivée, épinglée, au survol du bord, ou rail de jaquettes.", {"Off": "Désactivée", "Pinned": "Épinglée", "On hover": "Au survol", "Rail": "Rail"}),
    "Big Picture": ("Big Picture", "Couverture : l'art du jeu sélectionné remplit l'écran et donne sa couleur. L'accueil, lui, est remplacé par le XMB PS3 si le plugin Decky est installé.", {"Cover": "Couverture", "Steam": "Steam"}),
    "Big Picture home": ("Accueil Big Picture", "Grand art : l'art net sur tout le premier écran, carrousel en bas (sans le plugin XMB).", {"Big art": "Grand art", "Steam's": "Celui de Steam"}),
    "Big Picture hours chip": ("Big Picture : puce des heures", "Les chiffres du jeu sous le carrousel : temps de jeu, dernière partie, succès.", YES_NO),
    "Overlay background": ("Fond de l'overlay", "Derrière les panneaux Maj+Tab : voile léger ou feuille sombre de Steam.", {"Transparent": "Transparent", "Steam": "Steam"}),
    "Overlay panels": ("Panneaux de l'overlay", "Vue d'ensemble, navigateur et barre d'outils : verre fumé ou Steam.", {"Glass": "Verre", "Steam": "Steam"}),
    "Plugins": ("Plugins", "Les plugins Millennium avec leur propre interface : aux couleurs du thème ou d'origine.", {"Theme": "Thème", "Plugin's own": "D'origine"}),
}

conditions = {}
# The PS3 tab comes first in the settings.
PS3_COLOURS = [("silver", "Argent (janvier)"), ("gold", "Or (février)"), ("lime", "Citron vert (mars)"), ("pink", "Rose (avril)"),
               ("green", "Vert (mai)"), ("purple", "Pourpre (juin)"), ("teal", "Turquoise (juillet)"), ("sky", "Bleu ciel (août)"),
               ("blue", "Bleu (septembre)"), ("violet", "Violet (octobre)"), ("brown", "Marron (novembre)"), ("red", "Rouge (décembre)"), ("black", "Noir")]
css = lambda src, affects=(".*",): {"TargetCss": {"affects": list(affects), "src": src}}
conditions["XMB en Big Picture"] = {"default": "Activé", "tab": "PS3",
    "description": "Le vrai menu XMB de la PS3 remplace l'accueil de Big Picture (catégories, jeux, collections, captures, options △). Inutile d'installer Decky. Si le plugin Decky PS3 XMB est aussi installé, c'est lui qui s'affiche.",
    "values": {"Activé": {"TargetJs": {"affects": ["GamepadUIPopupWindowBody"], "src": "ps3/xmb.js"}}, "Désactivé": css("ps3/xmb-off.css")}}
conditions["Fond PS3"] = {"default": "Couleur du mois et vague XMB", "tab": "PS3",
    "description": "Le fond de la PS3 sous le verre de Glass Dusk, sur le bureau et dans tout Big Picture : la couleur change chaque mois et s'assombrit le soir, avec la vague XMB.",
    "values": {"Couleur du mois et vague XMB": css("ps3/ps3-bpm.css", ["GamepadUIPopupWindowBody"]), "Glass Dusk seul": css("ps3/off.css")}}
conditions["Couleur PS3"] = {"default": "Original (change chaque mois)", "tab": "PS3",
    "description": "Original suit le mois comme sur PS3. Les autres couleurs restent fixes.",
    "values": {"Original (change chaque mois)": {}, **{label: css(f"ps3/colours/{key}.css") for key, label in PS3_COLOURS}}}
conditions["Vague XMB"] = {"default": "Animée", "tab": "PS3",
    "description": "Animée : la vague ondule (20 images/s sur le bureau, 30 en Big Picture), en pause quand Steam est réduit ou en jeu. Fixe : dessinée une fois, pour les PC modestes.",
    "values": {"Animée": {}, "Fixe": css("ps3/wave-still.css"), "Masquée": css("ps3/wave-off.css")}}
conditions["Vague au-dessus de l'art du jeu"] = {"default": "yes", "tab": "PS3",
    "description": "Oui : la vague brille par-dessus l'art du jeu ouvert. Non : l'art du jeu la recouvre, comme le fond d'un jeu sur PS3.",
    "values": {"yes": {}, "no": css("ps3/wave-under.css")}}
conditions["Accent"] = {"default": "Art du jeu (Glass Dusk)", "tab": "PS3",
    "description": "Art du jeu : boutons et surbrillances aux couleurs du jeu ouvert. Couleur PS3 : la couleur du thème PS3 partout (menus et fenêtres compris).",
    "values": {"Art du jeu (Glass Dusk)": {}, "Couleur PS3": css("ps3/accent.css")}}
conditions["Teinte du verre"] = {"default": "Couleur PS3", "tab": "PS3",
    "description": "Couleur PS3 : le verre fumé prend la teinte du mois. Onglet Couleurs : la teinte « Glass tint » de l'onglet Couleurs.",
    "values": {"Couleur PS3": {}, "Onglet Couleurs": css("ps3/glass-own.css")}}
conditions["Assombrir le soir"] = {"default": "yes", "tab": "PS3",
    "description": "Comme la PS3, le fond s'assombrit de 18 h à 7 h.",
    "values": {"yes": {}, "no": css("ps3/night-off.css")}}

for name, spec in source["Conditions"].items():
    fr_name, fr_desc, values = FR[name]
    out = {k: v for k, v in spec.items() if k not in ("values", "default", "tab", "description")}
    out["default"] = values[spec["default"]]
    if name == "Theme language":
        out["default"] = "Français"
    out["tab"] = TABS.get(spec.get("tab", ""), spec.get("tab", ""))
    out["description"] = fr_desc
    out["values"] = {values[k]: v for k, v in spec["values"].items()}
    assert len(out["values"]) == len(spec["values"]), name
    conditions[fr_name] = out

skin = {k: v for k, v in source.items() if k not in ("Conditions", "Patches")}
skin.update({
    "name": "PS3 XMB · Glass Dusk",
    "description": "Le verre fumé et les couleurs dynamiques de Glass Dusk sur le fond de la PlayStation 3 : couleur du mois, vague XMB, accent tiré de l'art du jeu. Bibliothèque, magasin, menus, overlay et Big Picture. Compagnon du plugin Decky « PS3 XMB ».",
    "author": "Yareli (Glass Dusk) · adaptation PS3",
    "version": "0.2.5",
    "tags": ["PS3", "XMB", "Glass", "Dynamic", "Big Picture"],
})
skin.pop("github", None)  # the update check would point at Glass Dusk's repository
skin["Conditions"] = conditions
skin["Patches"] = source["Patches"] + [
    {"MatchRegexString": "^Steam$", "TargetCss": "ps3/ps3.css"},
    {"MatchRegexString": ".*", "TargetJs": "ps3/ps3.js"},
]
(THEME / "skin.json").write_text(json.dumps(skin, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# Check that every file the skin points to exists.
missing = []
for patch in skin["Patches"]:
    for key in ("TargetCss", "TargetJs"):
        if key in patch and not (THEME / patch[key]).is_file():
            missing.append(patch[key])
for cond in skin["Conditions"].values():
    for value in cond["values"].values():
        for target in value.values():
            if not (THEME / target["src"]).is_file():
                missing.append(target["src"])
for key in ("Steam-WebKit", "RootColors"):
    if not (THEME / skin[key]).is_file():
        missing.append(skin[key])
print("conditions:", len(conditions), "| missing files:", missing or "none")
