"""Builds PS3-XMB/skin.json from Glass Dusk's skin.json (tools/skin.glass-dusk.json).

Every Glass Dusk setting is kept with the same option files; names, values and descriptions
keep their English names, their descriptions gain a French line, and a "PS3" tab is added. Run: python tools/build-skin.py
"""
import json
from pathlib import Path

THEME = Path(__file__).resolve().parent.parent / "PS3-XMB"
source = json.loads((Path(__file__).resolve().parent / "skin.glass-dusk.json").read_text(encoding="utf-8"))

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
# Names and values are in English (Millennium has one label per setting, and steambrew.app is read
# worldwide); each description says it in English, then in French.
bi = lambda en, fr: f"{en}  ·  FR : {fr}"
PS3_COLOURS = [("silver", "Silver (January)"), ("gold", "Gold (February)"), ("lime", "Lime (March)"), ("pink", "Pink (April)"),
               ("green", "Green (May)"), ("purple", "Purple (June)"), ("teal", "Teal (July)"), ("sky", "Sky blue (August)"),
               ("blue", "Blue (September)"), ("violet", "Violet (October)"), ("brown", "Brown (November)"), ("red", "Red (December)"), ("black", "Black")]
css = lambda src, affects=(".*",): {"TargetCss": {"affects": list(affects), "src": src}}
# The PS3 tab comes first in the settings.
conditions["XMB in Big Picture"] = {"default": "On", "tab": "PS3",
    "description": bi("The real PS3 XMB replaces the Big Picture home (categories, games, collections, screenshots, △ options). No Decky needed; if the Decky PS3 XMB plugin is installed too, it is the one shown. Its language follows Steam's (System Settings → System Language).",
                      "le vrai menu XMB de la PS3 remplace l'accueil de Big Picture. Decky est inutile ; si le plugin Decky PS3 XMB est installé, c'est lui qui s'affiche. Sa langue suit celle de Steam."),
    "values": {"On": {"TargetJs": {"affects": ["GamepadUIPopupWindowBody"], "src": "ps3/xmb.js"}}, "Off": css("ps3/xmb-off.css")}}
conditions["PS3 background"] = {"default": "Monthly colour and XMB wave", "tab": "PS3",
    "description": bi("The PS3 background under Glass Dusk's glass, on the desktop and all through Big Picture: the colour changes every month and dims in the evening, with the XMB wave.",
                      "le fond de la PS3 sous le verre, sur le bureau et dans tout Big Picture : couleur du mois, assombrie le soir, et vague XMB."),
    "values": {"Monthly colour and XMB wave": css("ps3/ps3-bpm.css", ["GamepadUIPopupWindowBody"]), "Glass Dusk only": css("ps3/off.css")}}
conditions["PS3 colour"] = {"default": "Original (changes every month)", "tab": "PS3",
    "description": bi("Original follows the month, as on a PS3. The other colours stay fixed.", "Original suit le mois comme sur PS3 ; les autres couleurs restent fixes."),
    "values": {"Original (changes every month)": {}, **{label: css(f"ps3/colours/{key}.css") for key, label in PS3_COLOURS}}}
conditions["XMB wave"] = {"default": "Animated", "tab": "PS3",
    "description": bi("Animated: the wave drifts smoothly, always behind Steam, and pauses while Steam is minimised or you play. Still: drawn once, for modest PCs.",
                      "Animée : la vague ondule, toujours derrière Steam, en pause quand Steam est réduit ou en jeu. Fixe : dessinée une fois, pour les PC modestes."),
    "values": {"Animated": {}, "Still": css("ps3/wave-still.css"), "Hidden": css("ps3/wave-off.css")}}
conditions["Wave over the game art"] = {"default": "yes", "tab": "PS3",
    "description": bi("Yes: the wave shines over the open game's art. No: the art covers it, like a game's background on a PS3.",
                      "oui : la vague brille par-dessus l'art du jeu ouvert ; non : l'art du jeu la recouvre."),
    "values": {"yes": {}, "no": css("ps3/wave-under.css")}}
conditions["Accent"] = {"default": "Game art (Glass Dusk)", "tab": "PS3",
    "description": bi("Game art: buttons and highlights in the open game's colours. PS3 colour: the PS3 theme colour everywhere, menus and windows included.",
                      "Art du jeu : boutons et surbrillances aux couleurs du jeu ouvert. Couleur PS3 : la couleur du thème PS3 partout."),
    "values": {"Game art (Glass Dusk)": {}, "PS3 colour": css("ps3/accent.css")}}
conditions["Glass tint"] = {"default": "PS3 colour", "tab": "PS3",
    "description": bi("PS3 colour: the smoked glass takes the month's tint. Colours tab: the «Glass tint» of the Colours tab.",
                      "Couleur PS3 : le verre fumé prend la teinte du mois. Onglet Couleurs : la teinte « Glass tint » de l'onglet Couleurs."),
    "values": {"PS3 colour": {}, "Colours tab": css("ps3/glass-own.css")}}
conditions["Dim in the evening"] = {"default": "yes", "tab": "PS3",
    "description": bi("Like the PS3, the background dims from 6 pm to 7 am.", "comme la PS3, le fond s'assombrit de 18 h à 7 h."),
    "values": {"yes": {}, "no": css("ps3/night-off.css")}}

for name, spec in source["Conditions"].items():
    fr_name, fr_desc, _values = FR[name]
    out = dict(spec)
    out["description"] = bi(spec.get("description", ""), fr_desc)
    if name == "Theme language":
        # «Auto» follows Steam's interface language (js/dusk.js), English is now a choice of its own.
        out["values"] = {"Auto (Steam)": {}, "English": css("css/options/lang-en.css"),
                         **{k: v for k, v in spec["values"].items() if k != "English"}}
        out["default"] = "Auto (Steam)"
        out["description"] = bi("Text the theme draws itself: home header, Big Picture chip, dates. Auto follows Steam's language.",
                                "textes dessinés par le thème : en-tête de l'accueil, puce Big Picture, dates. Auto suit la langue de Steam.")
    conditions[name] = out

skin = {k: v for k, v in source.items() if k not in ("Conditions", "Patches")}
skin.update({
    "name": "PS3 XMB · Glass Dusk",
    "description": "The PlayStation 3 interface for Steam: a real XMB in Big Picture, and the PS3 background (colour of the month, XMB wave) under Glass Dusk's smoked glass and game-art colours on the desktop. English, French and 8 more languages.",
    "author": "LempereurTom (PS3 XMB) · Yareli (Glass Dusk)",
    "version": "0.3.0",
    "tags": ["PS3", "XMB", "Glass", "Dynamic", "Big Picture"],
})
# Its own repository (steambrew.app reads the README and updates from it), its own previews;
# Glass Dusk's funding link is Yareli's, so it is not carried over (she is credited in the README).
skin["github"] = {"owner": "LempereurTom", "repo_name": "ps3-xmb-theme"}
skin["header_image"] = "https://raw.githubusercontent.com/LempereurTom/ps3-xmb-theme/main/images/ps3-header.jpg"
skin["splash_image"] = "https://raw.githubusercontent.com/LempereurTom/ps3-xmb-theme/main/images/ps3-splash.jpg"
skin.pop("funding", None)
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
