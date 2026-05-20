import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<div><my-element class="svelte-70s021"></my-element></div> <my-element class="svelte-70s021"></my-element>`);
}