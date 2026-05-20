import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let a = 0;
	let b = 0;

	if (a) {
		$$renderer.push('<!--[0-->');

		let toShow;
		var promises = $$renderer.run([async () => toShow = (await $.save(a))()]);

		$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(toShow)));

		$$renderer.push(`
	${$.escape(b)}`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<button>click</button>`);
	}

	$$renderer.push(`<!--]-->`);
}