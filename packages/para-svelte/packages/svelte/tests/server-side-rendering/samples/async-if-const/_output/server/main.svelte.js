import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	if (false) {
		$$renderer.push('<!--[0-->');

		let one;
		var promises = $$renderer.run([async () => one = (await $.save(1))()]);

		$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(one)));
	} else if (false) {
		$$renderer.push('<!--[1-->');

		let two;
		var promises_1 = $$renderer.run([async () => two = (await $.save(2))()]);

		$$renderer.async([promises_1[0]], ($$renderer) => $$renderer.push(() => $.escape(two)));
	} else {
		$$renderer.push('<!--[-1-->');

		let three;
		var promises_2 = $$renderer.run([async () => three = (await $.save(3))()]);

		$$renderer.async([promises_2[0]], ($$renderer) => $$renderer.push(() => $.escape(three)));
	}

	$$renderer.push(`<!--]-->`);
}