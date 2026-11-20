// Test conversations, from github.com/anthay/ELIZA (CC0-1.0).
// [user input, ELIZA's exact reply]

/** The conversation printed in Weizenbaum's January 1966 CACM paper. */
export const CACM_1966: [string, string][] = [
  [
    "Men are all alike.",
    "IN WHAT WAY"
  ],
  [
    "They're always bugging us about something or other.",
    "CAN YOU THINK OF A SPECIFIC EXAMPLE"
  ],
  [
    "Well, my boyfriend made me come here.",
    "YOUR BOYFRIEND MADE YOU COME HERE"
  ],
  [
    "He says I'm depressed much of the time.",
    "I AM SORRY TO HEAR YOU ARE DEPRESSED"
  ],
  [
    "It's true. I am unhappy.",
    "DO YOU THINK COMING HERE WILL HELP YOU NOT TO BE UNHAPPY"
  ],
  [
    "I need some help, that much seems certain.",
    "WHAT WOULD IT MEAN TO YOU IF YOU GOT SOME HELP"
  ],
  [
    "Perhaps I could learn to get along with my mother.",
    "TELL ME MORE ABOUT YOUR FAMILY"
  ],
  [
    "My mother takes care of me.",
    "WHO ELSE IN YOUR FAMILY TAKES CARE OF YOU"
  ],
  [
    "My father.",
    "YOUR FATHER"
  ],
  [
    "You are like my father in some ways.",
    "WHAT RESEMBLANCE DO YOU SEE"
  ],
  [
    "You are not very aggressive but I think you don't want me to notice that.",
    "WHAT MAKES YOU THINK I AM NOT VERY AGGRESSIVE"
  ],
  [
    "You don't argue with me.",
    "WHY DO YOU THINK I DON'T ARGUE WITH YOU"
  ],
  [
    "You are afraid of me.",
    "DOES IT PLEASE YOU TO BELIEVE I AM AFRAID OF YOU"
  ],
  [
    "My father is afraid of everybody.",
    "WHAT ELSE COMES TO MIND WHEN YOU THINK OF YOUR FATHER"
  ],
  [
    "Bullies.",
    "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE"
  ]
];

/** Anthony Hay's imagined continuation (2023), for extra coverage. */
export const CONTINUATION_2023: [string, string][] = [
  [
    "My boyfriend loves me, he's not a bully.",
    "WHY DO YOU SAY YOUR BOYFRIEND LOVES YOU"
  ],
  [
    "He annoys me sometimes, but I know he cares about me.",
    "YOU SAY YOU KNOW HE CARES ABOUT YOU"
  ],
  [
    "That's why he wanted me to come here, because he knows I'm unhappy.",
    "WHY DO YOU ASK"
  ],
  [
    "I didn't.",
    "CAN YOU ELABORATE ON THAT"
  ],
  [
    "He knows I'm not getting on with my family and thought it would help me if I talked to someone.",
    "DO YOU THINK ITS LIKELY THAT YOU TALKED TO SOMEONE"
  ],
  [
    "That's why I'm talking to you.",
    "DOES THAT QUESTION INTEREST YOU"
  ],
  [
    "What question?",
    "WHAT IS IT YOU REALLY WANT TO KNOW"
  ],
  [
    "How to have a good relationship with my parents.",
    "DOES THAT SUGGEST ANYTHING ELSE WHICH BELONGS TO YOU"
  ],
  [
    "A brighter future?",
    "I AM NOT SURE I UNDERSTAND YOU FULLY"
  ],
  [
    "If I could get on better with my parents I'd be a lot happier.",
    "DO YOU WISH THAT YOU COULD GET ON BETTER WITH YOUR PARENTS I'D BE A LOT HAPPIER"
  ],
  [
    "I do.",
    "DO YOU SAY YOU DO FOR SOME SPECIAL REASON"
  ],
  [
    "Not really.",
    "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR MOTHER"
  ],
  [
    "I'll never be as good as my sister in my mom's eyes.",
    "TELL ME MORE ABOUT YOUR FAMILY"
  ],
  [
    "My sister did better at school than me and she's always got on better with my parents.",
    "WHO ELSE IN YOUR FAMILY DID BETTER AT SCHOOL THAN YOU AND SHE'S ALWAYS GOT ON BETTER WITH YOUR PARENTS"
  ],
  [
    "It's just me and my sister.",
    "YOUR SISTER"
  ],
  [
    "That's right.",
    "BUT YOUR MOTHER TAKES CARE OF YOU"
  ],
  [
    "She does, sure. She's not mean to me. It's just little things she does, probably without even knowing she's doing them, that make me feel stupid and not as loved as my sister.",
    "WHAT ELSE COMES TO MIND WHEN YOU THINK OF YOUR SISTER"
  ],
  [
    "I don't think she likes me much either.",
    "DON'T YOU REALLY THINK SHE LIKES YOU MUCH EITHER"
  ],
  [
    "She's older than me and I was always her silly little annoying sister.",
    "WERE YOU REALLY"
  ],
  [
    "She thought so.",
    "BUT YOUR FATHER"
  ],
  [
    "He dotes on her too.",
    "PLEASE GO ON"
  ]
];
