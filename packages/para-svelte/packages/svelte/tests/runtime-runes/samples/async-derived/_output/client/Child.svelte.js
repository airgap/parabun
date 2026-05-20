import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var value;

	var $$promises = $.run([
		async () => value = await $.async_derived(async () => $$props.num + await $$props.promise),
		() => {
			void $.user_effect(() => {
				console.log(`$effect ${$.get(value)} ${$$props.num}`);
			});

			void $.user_pre_effect(() => {
				console.log(`$effect.pre ${$.get(value)} ${$$props.num}`);
			});
		}
	]);

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, `${$.get(value) ?? ''}${$0 ?? ''}`), [() => console.log(`template ${$.get(value)} ${$$props.num}`)], void 0, [$$promises[1]]);
	$.append($$anchor, p);
	$.pop();
}