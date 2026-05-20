import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let time = new Date();
	let timeZone = 'UTC';

	(() => {})();
	$.init();
	$.pop();
}