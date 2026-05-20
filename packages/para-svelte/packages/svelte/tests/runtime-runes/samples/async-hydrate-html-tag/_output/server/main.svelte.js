import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	function firstTest() {
		return Promise.resolve('<p>first test</p>');
	}

	function otherTest() {
		return Promise.resolve('other test');
	}

	$$renderer.push(`<div><div>`);

	$$renderer.child_block(async ($$renderer) => {
		$$renderer.push($.html((await $.save(firstTest()))()));
	});

	$$renderer.push(`</div> `);
	$$renderer.push(async () => $.escape((await $.save(otherTest()))()));
	$$renderer.push(`</div>`);
}