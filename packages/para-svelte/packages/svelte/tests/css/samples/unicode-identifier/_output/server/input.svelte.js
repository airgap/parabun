import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div id="123" class="svelte-xyz"></div> <div id="line
break" class="svelte-xyz"></div> <div class="a🙂b svelte-xyz"></div> <div class="asdf svelte-xyz"></div> <div class="asdf svelte-xyz"></div> <div id="1" class="svelte-xyz"><span class="svelte-xyz"></span></div>`);
}