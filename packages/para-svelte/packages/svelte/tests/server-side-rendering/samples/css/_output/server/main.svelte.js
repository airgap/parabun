import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

const $$css = { hash: 'svelte-e9omc', code: '.foo.svelte-e9omc {color:red;}' };

export default function Main($$renderer) {
	$$renderer.global.css.add($$css);
	$$renderer.push(`<div class="foo svelte-e9omc">foo</div>`);
}