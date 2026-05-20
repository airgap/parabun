import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let done_replace_script_2 = 'hello';

	$$renderer.push(`<h1 class="done_replace_style_2 svelte-1vsrjd4">${$.escape(Math.random() < 1 && done_replace_script_2)}</h1>`);
}