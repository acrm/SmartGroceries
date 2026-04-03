const fs = require('fs');

let prep = fs.readFileSync('src/presentation/pages/PreparationPage.tsx', 'utf-8');
// I need global clear button. Wait, `handleGlobalClear` is defined in original PreparationPage? Yes, but I deleted it.
// Let's replace any handleGlobalClear usage with `() => clearPrepared()` or similar. Wait, there is no handleGlobalClear in my rewrite of Prep. Oh wait, I didn't restore Prep. Let's see what is on line 113 of Prep.
