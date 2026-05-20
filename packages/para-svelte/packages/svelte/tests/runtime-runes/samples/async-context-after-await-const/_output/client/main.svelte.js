import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { getContext } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var _unused,
		//This must be created after any $derived(await...)
		bar;

	var $$promises = $.run([
		async () => _unused = await $.async_derived(() => 1),
		() => bar = $.derived(() => getContext('') ?? 'hi')
	]);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			let foo;

			var promises = $.run([
				() => $$promises[1].promise,
				() => foo = $.derived(() => $.get(bar))
			]);

			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(foo)), void 0, void 0, [promises[1]]);
			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}