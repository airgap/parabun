import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Test($$anchor, $$props) {
	$.push($$props, true);

	async function c(a) {
		await Promise.resolve();

		if (a) {
			throw new Error('error');
		} else {
			return 'ok';
		}
	}

	let a = $.state(void 0);
	var b;
	var $$promises = $.run([async () => b = await $.async_derived(() => c($.get(a)))]);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(b)), void 0, void 0, [$$promises[0]]);
	$.delegated('click', button, () => $.set(a, 1));
	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);