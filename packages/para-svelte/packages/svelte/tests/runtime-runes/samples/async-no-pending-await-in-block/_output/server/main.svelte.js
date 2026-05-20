import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let { browser = typeof window !== 'undefined' } = $$props;

	$$renderer.child_block(async ($$renderer) => {
		if ((await $.save(true))()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<h1>hello from the ${$.escape(browser ? 'browser' : 'server')}</h1>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]--> <h2>hello from the ${$.escape(browser ? 'browser' : 'server')}</h2> <h3>hello from the ${$.escape(browser ? 'browser' : 'server')}</h3>`);
}