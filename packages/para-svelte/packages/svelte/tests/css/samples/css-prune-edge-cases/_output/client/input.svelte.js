import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="foo bar svelte-xyz">word match</div> <div class="foobar svelte-xyz">substring only</div> <div class="bar-foo baz svelte-xyz">hyphen separated</div> <div class="afoo foo-x svelte-xyz">prefix substring</div> <main class="svelte-xyz"><article class="svelte-xyz"><section class="svelte-xyz"><div class="svelte-xyz"><span class="deep svelte-xyz">deep</span></div></section></article></main> <nav class="primary svelte-xyz"><a href="/" class="svelte-xyz">link</a></nav> <nav class="secondary svelte-xyz"><button class="svelte-xyz">action</button></nav> <p class="a-b svelte-xyz">escaped</p> <header class="svelte-xyz"><h1 class="svelte-xyz">title</h1></header> <ul class="svelte-xyz"><li class="active svelte-xyz"><span class="svelte-xyz">item</span></li></ul>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(18);
	$.append($$anchor, fragment);
}