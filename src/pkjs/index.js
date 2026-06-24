// PebbleKit JS — runs on the phone.
// Fetches weather (hourly), picks a random embedded WH40K quote (every 10 min).
// Uses XMLHttpRequest — fetch() is not available in the PebbleKit JS runtime.

var KEY_WEATHER = 0;
var KEY_QUOTE   = 1;

// ── XHR helper ────────────────────────────────────────────────────────────────

function xhrGet(url, responseType, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = responseType;
    xhr.onload = function() {
        if (xhr.status === 200) {
            onSuccess(xhr.response);
        } else {
            onError('HTTP ' + xhr.status);
        }
    };
    xhr.onerror = function() { onError('XHR network error'); };
    xhr.send();
}

// ── Weather ───────────────────────────────────────────────────────────────────

function getWeatherDescription(code) {
    if (code === 0)  return 'Clear';
    if (code <= 3)   return 'Cloudy';
    if (code <= 48)  return 'Fog';
    if (code <= 55)  return 'Drizzle';
    if (code <= 57)  return 'Fz.Drizzle';
    if (code <= 65)  return 'Rain';
    if (code <= 67)  return 'Fz.Rain';
    if (code <= 75)  return 'Snow';
    if (code <= 77)  return 'Snow Grns';
    if (code <= 82)  return 'Showers';
    if (code <= 86)  return 'Snow Shwrs';
    if (code <= 99)  return 'T-Storm';
    return 'Unknown';
}

function fetchWeather(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + lat +
        '&longitude=' + lon +
        '&current=temperature_2m,weather_code';

    xhrGet(url, 'json', function(data) {
        var temp = Math.round(data.current.temperature_2m);
        var desc = getWeatherDescription(data.current.weather_code);
        var msg  = {};
        msg[KEY_WEATHER] = temp + '°C ' + desc;
        Pebble.sendAppMessage(msg,
            null,
            function(e) { console.log('Weather send failed: ' + JSON.stringify(e)); }
        );
    }, function(err) {
        console.log('Weather fetch error: ' + err);
    });
}

function requestWeather() {
    if (!navigator.geolocation) {
        console.log('Geolocation not available');
        var msg = {}; msg[KEY_WEATHER] = 'No GPS';
        Pebble.sendAppMessage(msg);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        function(err) {
            console.log('Geolocation error: ' + err.message);
            var msg = {}; msg[KEY_WEATHER] = 'GPS err';
            Pebble.sendAppMessage(msg);
        },
        { timeout: 15000, maximumAge: 300000 }
    );
}

// ── Embedded WH40K quotes ──────────────────────────────────────────────────────
// 481 quotes from thoughts.txt — no network needed

var QUOTES = [
    "Though silver in your palms weighs light compared to death by blast and sword, Do not shy the hopeless fight, For endeavour is its own reward.",
    "A broad mind lacks focus.",
    "A coward always seeks compromise",
    "A coward’s only reward is to live in fear another day.",
    "A dedicated life may reach the end of infinity.",
    "A fine mind is a blessing of the Emperor - It should not be cluttered with trivialities.",
    "A good soldier obeys without question. A good officer commands without doubt.",
    "A hundred thousand worlds, ten hundred thousand wars. There is no respite, there is nowhere to hide. Across the galaxy there is only war.",
    "A logical argument must be dismissed with absolute conviction!",
    "A mind without purpose will wander in dark places",
    "A moment of laxity spawns a lifetime of heresy.",
    "A narrow view sees better",
    "A questioning mind betrays a treacherous soul.",
    "A questioning servant is more dangerous than an ignorant heretic",
    "A single thought of heresy can blight a lifetime of faithful duty.",
    "A small mind is a tidy mind.",
    "A small mind is easily filled with faith.",
    "A suspicious mind is a healthy mind",
    "A warrior's faith in his commander is his best armour and his strongest weapon.",
    "A weapon cannot substitute for zeal",
    "A wise man learns from the death of others",
    "Abhor the Night, it is the Light that Endures!",
    "Accept your lot!",
    "Adamantium walls and plasteel bulkheads may seem formidable, but an unshakeable faith in the Immortal Emperor of Man can overcome any barriers.",
    "Against the Alien and the Traitor there is no fair way to fight.",
    "All Daemons are Falsehood. They are lies given the shape of creatures by the fell power of Chaos.",
    "All hail the martyrs! On their blood is our Imperium founded, in their remembrance do we honour ourselves.",
    "All mortal life is folly that does not feed the spirit",
    "All our ignorances bring us closer to annihilation.",
    "All praise to the Emperor.",
    "All souls cry out for salvation.",
    "An Empty Mind Is A Loyal Mind",
    "An alien mind cannot accept the Emperor’s Blessing.",
    "An open mind is like a fortress with its gates unbarred and unguarded.",
    "An unprotected soul can no more cross the storms of the warp than a heretic can bear the gaze of the Inquisition",
    "Analysis is the bane of conviction",
    "Appeasement is a curse",
    "As the mind to the body so the soul to the spirit, as death to the mortal man so failure to the immortal, such is the price of all ambition.",
    "Bayonets don’t need ammo.",
    "Be Pure.",
    "Be courageous and bold, be humble before your masters, lead with valour! These things above all others will be of use when your time comes to die.",
    "Be grateful of your Master's favour!",
    "Be sound of mind or your argument is lost before it has begun",
    "Be strong in your ignorance.",
    "Be vigilant and strong. The Emperor knows what evil lurks in the vacillation of a weak fool.",
    "Between the stars the ancient unseen enemies of mankind wait and hunger.",
    "Every voyage into the nothing is a confrontation with horror, with the implacable things of the warp, and with man's own innermost fears.",
    "Belligerence allied to faith can move a mountain",
    "Better crippled in body than corrupt in mind.",
    "Better to self-destruct than acquiesce",
    "Beyond the Emperor’s reach lies only darkness and despair.",
    "Big guns never tire.",
    "Blessed are the Gun Makers.",
    "Blessed is the mind too small for doubt!",
    "Blind faith is a just cause.",
    "Brave are they who know everything yet fear nothing",
    "Brave men do not question, they simply act.",
    "Burn the Heretic!",
    "Burn the Heretic! Kill the Mutant! Purge the Unclean!",
    "Burn the Unclean with the fires of Purity.",
    "By the manner of our death are we judged.",
    "By the manner of their death we shall know them.",
    "Cadia Stands! It will stand until the Eye burns cold.",
    "Call no man happy until he is dead.",
    "Carry the Emperor's will as your torch, with it destroy the shadows",
    "Cast out the mutant, the traitor, the heretic. For every enemy without there are a hundred within.",
    "Cease and repent!",
    "Cease purpose and you will surely die.",
    "Cleanse yourself in the blood of our enemies.",
    "Do not shy the hopeless fight, For endeavour is its own reward.",
    "Compromise is akin to treachery",
    "Contemplation is the womb of treachery",
    "Courage is the Emperor’s gift: repay him with victory.",
    "Courage is the mastery of fear - not the absence of fear.",
    "Curse now the death in vain.",
    "Damnation is eternal.",
    "Dark dreams lie upon the heart",
    "Death brings its own reward.",
    "Death is honor",
    "Death is the only answer",
    "Death is the servant of the righteous.",
    "Defile not his presence",
    "Defile the Mutant.",
    "Despair is a sign of weakness.",
    "Destroy, destroy, destroy!",
    "Do Not Wait for Death.",
    "Do not ask how you may give your life for the Emperor. Ask instead how you may give your death.",
    "Do not question the Will of the Emperor!",
    "Do not waste your tears. I was not born to watch the world grow dim. Life is not measured in years, but by the deeds of men.",
    "Life is not measured in years, but by the deeds of men.",
    "Doubt forms the path to damnation",
    "Doubt is a sign of weakness",
    "Drink deep of victory and remember the fallen.",
    "Duty prevails",
    "EMPEROR PROTECTS",
    "Enlightenment is a myth we do not need to understand in order to hate.",
    "Even a man who has nothing can still offer his life.",
    "Even though you once called him friend, the Traitor has forsaken you. Show no mercy even if he begs it, for his soul is tainted and given the chance he will betray your trust.",
    "Every Lone Spirit Doubts Their Strength",
    "Every human life is a spark in the darkness.",
    "Every human life is a spark in the darkness. It flares for a moment, catches the eye, and is gone. A retinal afterimage that fades and is obscured forever by newer, brighter lights.",
    "Every lone spirit doubts his strength",
    "Every man is a spark in the darkness. By the time he is noticed he is gone forever. A retinal after-image that fades and is obscured by newer, brighter lights.",
    "Examine your thoughts!",
    "Excuses are the refuge of the weak.",
    "Exist for the Emperor.",
    "Facts are chains that bind perception and fetter truth. For a man can remake the world if he has a dream and no facts to cloud his mind.",
    "Faith grows from the barrel of a gun.",
    "Faith in the Emperor is its own reward",
    "Faith is stronger than Adamantium",
    "Faith is the strongest shield.",
    "Faith is your shield.",
    "Faith without deeds is worthless.",
    "Faith, Hate and Ignorance",
    "Faith. Honour. Vigilance.",
    "Fear is the Mind Killer.",
    "Fear not death, for the soul of the faithful man never dies.",
    "Fear not the creatures of the jungle but those that lurk within your mind.",
    "Fear that which you do not know. Kill all that you fear.",
    "Fear the shadows; despise the night. There are horrors that no man can face and survive.",
    "Follow the Emperor, and the glory of victory shall be yours",
    "Foolish are those who fear nothing, yet claim to know everything",
    "For a warrior the only crime is cowardice.",
    "Endeavour is its own reward.",
    "For every battle honour, a thousand heroes die alone, unsung, and unremembered.",
    "For the foes of Mankind, the only mercy is a swift death",
    "For those who seek perfection there can be no rest this side of the grave",
    "Forgiveness is a sign of weakness.",
    "Fortune Favours the Faithful",
    "Forward Brothers, with loyalty to victory and glory!",
    "Glory in death is life Eternal",
    "Hail the Emperor!",
    "Happiness is a delusion of the weak",
    "Hard work conquers everything.",
    "Hate enriches",
    "Hatred is our surest weapon.",
    "Hatred is the Emperor's greatest gift to humanity.",
    "Hatred is your shield.",
    "Hatred steels our resolve.",
    "He bears the weight of Mankind's ills",
    "He who allows the alien to live shares its crime of existence.",
    "He who lives for nothing is nothing. He who dies for the Emperor is a hero.",
    "He who picks up the sword against us, shall perish by it.",
    "Heresy grows from idleness",
    "Heresy must be met with hatred.",
    "His Word is Our Strength.",
    "His will be done.",
    "Honor is what a pure mind knows about itself",
    "Honor your Chapter.",
    "Honour, Duty & Obedience.",
    "Hope Is A Luxury.",
    "Hope is the beginning of unhappiness.",
    "Hope is the first step on the road to disappointment.",
    "Humanity is an ocean; if a few drops of the ocean are polluted then the ocean is tainted.",
    "If a job's worth doing it's worth dying for!",
    "If a man dies that another should live, that man's spirit shall eat at the Emperor's table",
    "If you cannot speak well of your master, be silent!",
    "Ignorance is a virtue",
    "Ignorance is armour enough.",
    "Ignorance is bliss",
    "Ignorance is your best defence.",
    "In an hour of Darkness a blind man is the best guide. In an age of Insanity look to the madman to show the way.",
    "In courage we have no equals.",
    "In our resolve we only reflect his purpose of will.",
    "In the blazing furnace of battle we shall forge anew the iron will of yet a stronger race.",
    "In the darkest of moments, the Emperor’s light shines brightest.",
    "In the darkness a blind man is the best guide. In an age of Madness look to the madman to show the way.",
    "In those times of darkness, my noble sons will shine brightest of all.",
    "Information Is Power",
    "Innocence proves nothing…",
    "Inspiration grows from the barrel of a gun.",
    "Intellect is a mask for traitors",
    "Intolerance is a blessing",
    "It is better for a man to be afraid than happy.",
    "It is better that one hundred innocent fall before the wrath of the Emperor than one traitor kneels before the lords of darkness",
    "It is better to die for the Emperor than to live for yourself.",
    "It is not the Horror of War that troubles me but the Unseen Horrors of Peace.",
    "It is the bitter tears that the Gods weep that bind us to their hearts",
    "It is the measure of the man, and not his wargear, that matters in the eyes of the Emperor.",
    "It is through the Destruction of our Enemies, that we Earn our Salvation",
    "It is not in my mind to ask questions that cannot be answered. That is the soul standing upon the crossroad of vacillation. You search for wisdom, but achieve only a stasis of will.",
    "Kill the Mutant!",
    "Know No Fear.",
    "Know the mutant; kill the mutant.",
    "Know thine enemy",
    "Know your destination before you set out",
    "Know your duty!",
    "Knowledge is Power; Power Corrupts.",
    "Knowledge is half the battle.",
    "Knowledge is power, hide it well.",
    "Knowledge is to be feared!",
    "Labour long in his sight.",
    "Leniency is a sign of weakness!",
    "Let faith protect your mind and metal your flesh",
    "Let not the Mutant seek our places and share our lot.",
    "Let your soul be armoured with Faith, driven on the tracks of Obedience which overcome all obstacles, and armed with the three great guns of Zeal, Duty and Purity.",
    "Life is a prison, death shall be my release",
    "Life is the Emperor's currency, spend it well",
    "Listen not to the alien, look not upon the alien, speak not unto the alien!",
    "Look to your labours and trust to your faith. All else is beyond you.",
    "Look to your wargear!",
    "Look upon the Emperor's Works and tremble!",
    "Losses are acceptable. Failure is not.",
    "Loyalty is your Armour.",
    "Mankind stands on the shoulders of the Martyred",
    "May the Emperor's Wrath forever cleanse our souls",
    "Mercy is a sign of weakness.",
    "My armour is contempt.",
    "Negotiation is surrender.",
    "Never forget, never forgive.",
    "No Mercy. No Remorse. Just Kill.",
    "No army is big enough to conquer the galaxy. But faith alone can overturn the universe.",
    "No forgiveness",
    "No man died in the Emperor's service that died in vain",
    "No man that died in the Emperor's service died in vain.",
    "No pity! No remorse! No fear!",
    "No respite",
    "None are innocent, there are only varying degrees of guilt.",
    "Not Even The Dead Know The End Of War",
    "Nothing Can Hide From The Wrath Of The Emperor.",
    "Nothing inspires revenge quite like cold hearted hatred",
    "Obedience is blind.",
    "Obedience is not enough.",
    "Official! The graves of wariors who have given their lives for the Emperor now outnumber the stars themselves.",
    "On the battlefield, valour is the lifeblood of victory.",
    "One man is not at army, but an army must act with one purpose.",
    "Only The Lost Understand True Terror",
    "Only in death does duty end.",
    "Only the awkward question; only the foolish ask twice.",
    "Only the faithless question.",
    "Only the insane have strength enough to prosper. Only those who prosper may truly judge what is sane.",
    "Only those that follow the guiding light of the Emperor may save their souls.",
    "Our enemies are mortal no longer. Face them squarely and without flinching from duty. Mercy for such as them is self-deception",
    "Our mercies destroys us",
    "Our presence remakes the past",
    "Over the faithful, fear has no dominion",
    "Pain is an illusion caused by fear",
    "Pain is an illusion of the senses, despair an illusion of the mind",
    "Peace is Hell.",
    "Perseverance and silence are the highest virtues",
    "Pity ye Not!",
    "Place your trust in the Emperor's steel",
    "Power resides in the will of the Righteous",
    "Praise the sun that brings the dawn of our final doom.",
    "Prayer cleanses the soul, but pain cleanses the body",
    "Pure in body, pure in heart",
    "Purge the Unclean!",
    "Purge those who are unclean",
    "Reach out to embrace the glories that will come",
    "Reason begets doubt; Doubt begets heresy.",
    "Reason is the cloak of Traitors",
    "Reason is the refuge of the faithless",
    "Rejoice in service!",
    "Revere the Omnissiah, for it is the source of all power.",
    "Ruthlessness is the kindness of the wise",
    "Save & Destroy.",
    "Seek honour as you act, and you will know no fear.",
    "Seek no reward but the satisfaction of your Master!",
    "Serve the Emperor today - tomorrow you may be dead!",
    "Serve the Emperor!",
    "Sins hidden in the heart turn all into decay.",
    "Smite those that disbelieve, for they have turned from the light and fallen.",
    "Sometimes the good must perish so that the rest survive. The lot of courage is to be sacrificed upon the altar of battle.",
    "Sorrow awaits the foolhardy",
    "Speed the bolt that brings the end of enemy and friend.",
    "Step not from the path of the Emperor.",
    "Study the alien, the better to kill it",
    "Submit to His will",
    "Success is commemorated. Failure merely remembered.",
    "Success is measured in blood; yours or your enemy's.",
    "Suffering is the just reward of the inattentive.",
    "Survival is no birthright, but a prize wrested from an uncaring galaxy by forgotten heroes.",
    "That which I cannot crush with words alone, I shall crush with the tanks of the Imperial Guard!",
    "The Age of Battle has begun.",
    "The Alien dream is to dance on the grave of Mankind.",
    "The Alien fails because it cannot embrace the Emperor.",
    "The common man is like a worm in the gut of a corpse, trapped inside a prison of cold flesh, helpless and uncaring, unaware even of the inevitability of its own doom.",
    "The Dark Gods laugh at the foolishness of meek appeasers",
    "The Emperor Knows.",
    "The Emperor asks only that you hate",
    "The Emperor asks only that you obey",
    "The Emperor bestows upon us the gift of intolerance.",
    "The Emperor commands; We act.",
    "The Emperor is our guiding light, a beacon of hope for humanity in a galaxy of darkness.",
    "In the dark when the shadows threaten, the Emperor is with us, in spirit and in fact.",
    "The Emperor knows, the Emperor is watching",
    "The Emperor will not judge you by your medals and diplomas but by your scars.",
    "The Emperor's judgement is a blessing for the Faithful.",
    "The Emperor's mercy is neither to forgive nor to forget but to accept.",
    "The Emperor’s Judgement is greater than Reason.",
    "The Martyr's grave is the foundation of the Imperium",
    "The Martyr's grave is the keystone of the Imperium",
    "The Mighty have no room for doubt",
    "The Mutant bears his heresy on the outside, the Traitor hides it in his Soul.",
    "The Priesthood of Mars maintain our Emperor's throne. Thusly do they underpin the Imperium entire.",
    "The Traitor Can Seek No Salvation",
    "The alien dream is to dance on the grave of mankind.",
    "The best way of improving a gun is to improve its ammunition.",
    "The blood of martyrs is the seed of the Imperium.",
    "The blood of the martyrs is the seed of the Imperium.",
    "The burden of failure is the most terrible punishment of all.",
    "The cosmos cries out for salvation",
    "The dead cannot cry out for revenge; it is a duty of the living to do so for them",
    "The dead watch over us and guide us.",
    "The difference between heresy and treachery is ignorance",
    "The dissident invites only retribution",
    "The ends always justify the means.",
    "The enemies of the Emperor fear many things. They fear discovery, defeat, despair and death. Yet there is one thing they fear above all others. They fear the wrath of Space Marines!",
    "The fear of death is more to be dreaded than death itself",
    "The flesh is weak. The weak shall perish.",
    "The flesh of your body is a reminder of your own mortality. Transcend the flesh and know immortality.",
    "The foolish man puts his trust in luck, the wise man puts his trust in the Emperor.",
    "The future is trivia.",
    "The greatest man is but a ripple on the surface of space",
    "The guilt of heresy weighs heavy on the soul.",
    "The heretic shall reap as he sown - the bitter harvest of vengeance and death.",
    "The industrious may escape death.",
    "The justice of your action is measured by the strength of your conviction.",
    "The keenest blade is righteous hatred.",
    "The loyal servant learns to love the lash",
    "The man that sings the Emperor's praise will speak a blessing all his days.",
    "The man who has nothing can still have faith",
    "The more one learns of the alien, the more one will come to loath it.",
    "The mortal burden carried dutifully to its destination is the Emperor's greatest praise.",
    "The most deviant mind is often concealed in an unblemished body.",
    "The only crime is cowardice.",
    "The only reaction to treachery is vengeance.",
    "The only true gift, is zeal.",
    "The path of righteousness leads to the palace of wisdom",
    "The reward for treachery is retribution",
    "The rewards of tolerance are treachery and betrayal.",
    "The road to purity is drenched in the blood of the martyred.",
    "The same hammer that shatters the glass, forges the steel.",
    "The seed of heresy rests in the minds of reasonable men",
    "The strength of Humanity is the Emperor",
    "The traitorʹs hand lies closer than you think.",
    "The true sickness of our age is heresy.",
    "The truly heroic trust in blind faith.",
    "The truly wise are always afraid",
    "The truth is terrible to bear.",
    "The universe is a big place and, whatever happens, you will not be missed...",
    "The wage of negligence is utter destruction.",
    "The walk through hell is the road to glory.",
    "The weak will always be led by the strong. Despise the weak for they shall flock to the call of the Daemon and the Renegade.",
    "The weapon slays where the hand wills",
    "The weapon slays where the hand wills. Serve the Emperor!",
    "The will of the Emperor is the might of the Imperium",
    "The wise man learns from the deaths of others.",
    "The word of the Emperor is the rule of the Imperium",
    "Their defeat is not a matter of when but how.",
    "There are no answers. Only Death.",
    "There are no walls strong enough to protect the enemies of Mankind.",
    "There is no being so foul as the traitor.",
    "There is no cowardice in faith",
    "There is no fear in conviction",
    "There is no greater glory than a lifetime of dutiful service",
    "There is no peace amongst the stars, only an eternity of carnage and slaughter and the laughter of thirsting gods.",
    "There is no right or wrong in our profession. The present changes the past from moment to moment. Only pray for the future to vindicate your action.",
    "There is no respite, there is nowhere to hide. Across the galaxy there is only war.",
    "There is no salvation without suffering.",
    "There is no substitute for zeal",
    "There is no time for Peace.",
    "There is nothing to fear but failure.",
    "There is only WAR!",
    "There is no time for Peace. No respite. No forgiveness. There is only WAR!",
    "There is only the Emperor, and he is our shield and protector",
    "There is purity of purpose in the faith of the just",
    "There will be no retreat from Hades Hive. We will fight to the end.",
    "They fear the wrath of the Space Marines!",
    "They who feast today do so in ignorance of their mortality. Tomorrow they must die or change.",
    "This galaxy is ours, by His will.",
    "Those who act in honour cannot fail.",
    "Thou shalt not!",
    "Though my guards may sleep and ships may lie at anchor, our foes know full well that big guns never tire.",
    "Thought begets Heresy; Heresy begets Retribution.",
    "Through the destruction of our enemies we earn our salvation.",
    "Timidity begets Indecision; Indecision begets Treachery",
    "To admit defeat is to blaspheme against the Emperor",
    "To attempt understanding is folly when dealing with aliens.",
    "To compromise is to err",
    "To die alongside heroes, is to live in the light of the Emperor.",
    "To die without purpose is not a service.",
    "To err is to invite retribution.",
    "To err is human; to err again is treachery.",
    "To fail in the service of the Emperor is the greatest of sins.",
    "To fault the Emperor's Word is an act of sedition",
    "To know the xenos is to hate the xenos.",
    "To question is to doubt",
    "To question the Emperor's will is to embrace heresy.",
    "To serve Him is to worship Him.",
    "To withdraw in disgust is not apathy.",
    "To withdraw in disgust is not cowardice.",
    "True faith is blind and justified",
    "True happiness stems only from duty.",
    "Trust not in their appearance, for the Eldar are as alien to good, honest men as the vile Tyranids and savage Orks.",
    "Truth begets hatred",
    "Trying to understand weakens the will to act",
    "Unshakeable faith in the Immortal Emperor of Man can overcome any barriers.",
    "Vengeance is your sword. Hatred is your shield. Loyalty is your Armour.",
    "Victory needs no explanation; Defeat allows none.",
    "Victory through superior firepower.",
    "Vigilance is the brother of truth",
    "Vigilance is your shield",
    "Watch for the Mutant",
    "We are all a weapon in the hands of the Emperor.",
    "We are bound by the blood of Martyrs.",
    "We are judged in life for the evil we destroy.",
    "We can rebuild them",
    "We cannot afford mercy",
    "We must be as unsleeping in vigilance, swift in judgement, merciless in deed.",
    "We must endure the present so that those who follow may continue our endeavours.",
    "We shall carry our word, We will correct and unify, Hail the Emperor!",
    "Weigh the fist that strikes men down and salutes the battle won.",
    "What a pity it is that we can die but once to serve our Emperor!",
    "What fear of death have we who know there is immortality in the great and noble deeds of men?",
    "What is the terror of death? That we die our work incomplete.",
    "What is the joy of life? To die knowing our task is done.",
    "What is the terror of death? That we die our work incomplete. What is the joy of life? To die knowing our task is done.",
    "What is your life? My honour is my life.",
    "What is your fate? My duty is my fate.",
    "What is your fear? My fear is to fall.",
    "What is your reward? My salvation is my reward.",
    "What is your craft? My craft is death.",
    "What is your pledge? My pledge is eternal service.",
    "What is your life? Honour. What is your fate? Duty. What is your fear? To fall. What is your reward? Salvation. What is your craft? Death.",
    "Will is not enough. Act!",
    "Wisdom is the beginning of fear.",
    "Without Him there is nothing.",
    "Words do not win wars. Deeds do.",
    "Work earns salvation",
    "You are either for the Emperor or you are his bitter foe",
    "You are not required to think, only to act",
    "You carry the Emperor's will as your torch. With it destroy the shadows.",
    "Your freedom must be bought in the currency of toil, tears and blood; a price all men can pay.",
    "Your honour is your life. Let none dispute it.",
    "Your life belongs for the Emperor, and your body to His Imperial Guard.",
    "Zeal is its own excuse",
    "Only those that prosper truly judge what is sane.",
    "You are the Emperor's Chosen.",
    "Hear His great anger in the roar of the bolt pistol. See His almighty fury in the blades of the chainsword. Feel His undying strength in the protection of your armour.",
    "To a Marine the boltgun is far more than a weapon, it is an instrument of Mankind's divinity, the bringer of death to his foes, whose howling blast is a prayer to the gods of battle",
    "Vigilus shall not be allowed to fall.",
    "Leave well enough alone.",
    "Death to all those who would hinder us.",
    "Damnation to all who turn from the Emperor’s light.",
    "---REDACTED---",
    "--- REDACTED ---",
    "--- RECORDS DELETED ---",
    "Cursed indeed is the man who has never picked up a blade in the cause of a just war.",
    "-+- REDACTED -+-",
    "-+- ReDAcTEd.. -+-",
    "Even in Death I Serve",
    "In the grim darkness of the future there is only war",
    "---REDACTED---",
    "--- REDACTED ---",
    "--- RECORDS DELETED ---",
    "-+- REDACTED -+-",
    "-+- CroUptIon DetECtEd: Purge initiated... -+-",
    "Find comfort solely in your duty.",
    "Admire the machine, for you too were made to serve His will.",
    "To act without falter is to obey without question.",
    "Claims of innocence men nothing: they only serve to prove a foolish lack of caution.",
    "Mercy destrys us; it weakens us and saps our resolve.  Put aside all such thoughts.",
    "Only in your deepest self is the truth of what you can be.  And, without a doubt, that truth is terrible to bear.",
    "Trust no one. Trust not even yourself.",
    "It is better to die in vain than to live an abomination.",
    "I am not asking for blood.  I can take your blood.  I am asking for souls.  Only you can give me your souls.",
    "A Heretic may see the truth and seek redemption.  He may be forgiven his past and be absolved in death.  A traitor can never be forgiven.",
    "The Inquisition are the bright saviours in an eclipse of pure evil.",
    "Alone, we stand as bastions of strength.  But when we fight site by side, we are a fortress of faith that no foe can overcome.",
    "Cadia Stands!",
    "Cadia is all of us now. Cadia stands.",
    "Let none slow your pursuit and acquisition of holy technology.",
    "Exitus acta probat: the outcome justified the deed.",
    "Two angels dwell within us.  One who lives light, the other who waits in shadow and blood. Victory demands that we are both.",
    "The kindness of angels is the sharpness of a sword edge.",
    "The surest way to win a battle is to attack before the enemy knows they are fighting.  The surest way to lose is to not realise who your enemy is.",
    "From wisdom flows control, from control, strength, from strength, victory.",
    "There is no sacrifice more noble than to give your life for a cause in which you truely belive. There has never been a worthier cause than that of the Imperium.",
    "For he today that sheds his blood with me shall be my battle-brother eternal.",
    "Fear the unknown, and make ignorance your hearth."
];

// Word-wrap at 40 chars (matches PHP wordwrap($thought, 40, "|"))
function wordWrap(text) {
    var words = text.split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (cur === '') {
            cur = w;
        } else if (cur.length + 1 + w.length <= 40) {
            cur += ' ' + w;
        } else {
            lines.push(cur);
            cur = w;
        }
    }
    if (cur) lines.push(cur);
    return lines.join('|');
}

function sendRandomQuote() {
    var idx = Math.floor(Math.random() * QUOTES.length);
    var wrapped = wordWrap(QUOTES[idx]);
    var msg = {};
    msg[KEY_QUOTE] = '++ THOUGHT FOR THE DAY ++|' + wrapped;
    Pebble.sendAppMessage(msg,
        null,
        function(e) { console.log('Quote send failed: ' + JSON.stringify(e)); }
    );
}

// ── Startup ───────────────────────────────────────────────────────────────────

Pebble.addEventListener('ready', function() {
    requestWeather();
    sendRandomQuote();
    setInterval(requestWeather, 60 * 60 * 1000);
    setInterval(sendRandomQuote, 10 * 60 * 1000);
});