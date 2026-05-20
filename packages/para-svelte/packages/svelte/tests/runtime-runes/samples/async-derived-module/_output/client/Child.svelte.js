import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { create_derived } from './state.svelte.js';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var derived;

	var $$promises = $.run([
		async () => derived = await create_derived(() => $$props.promise, () => $$props.num),
		() => {
			void $.user_effect(() => {
				console.log(`$effect ${derived.value} ${$$props.num}`);
			});

			void $.user_pre_effect(() => {
				console.log(`$effect.pre ${derived.value} ${$$props.num}`);
			});
		}
	]);

	var p = root();
	var text = $.child(p);

	$.reset(p);

	$.template_effect(
		($0) => $.set_text(text, `${derived.value ?? ''}${$0 ?? ''}`),
		[
			() => console.log(`template ${derived.value} ${$$props.num}`)
		],
		void 0,
		[$$promises[1]]
	);

	$.append($$anchor, p);
	$.pop();
}