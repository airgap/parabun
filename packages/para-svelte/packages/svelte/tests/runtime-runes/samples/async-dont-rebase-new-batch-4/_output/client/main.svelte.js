import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { untrack } from "svelte";

var root = $.from_html(`<button> </button> <button>unrelated++</button> <button>resolve</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let double = $.derived(() => $.get(count) * 2);
	let count_mirror = $.state(0);
	let unrelated = $.state(0);
	let count_mirror_d = $.derived(() => $.get(count_mirror) * 2);
	const queued = [];

	function delay(v) {
		if (!v) return v;

		return new Promise((resolve) => {
			queued.push(() => resolve(v));
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		var consequent = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(($0, $1) => $.set_text(text_1, `${$0 ?? ''} ${$1 ?? ''}`), [
				() => (() => {
					$.user_effect(() => {
						$.set(count_mirror, $.get(count), true);
						untrack(() => $.get(count_mirror_d // execute derived; should associate value with the right batch
						));
					});
				})(),

				() => (() => {
					$.user_effect(() => {
						console.log($.get(double));
					});
				})()
			]);

			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if ($.get(count)) $$render(consequent);
		});
	}

	$.template_effect(($0, $1) => $.set_text(text, `count ${$0 ?? ''} | count_mirror ${$1 ?? ''} | count_mirror_d ${$.get(count_mirror_d) ?? ''} | unrelated ${$.get(unrelated) ?? ''}`), void 0, [() => delay($.get(count)), () => delay($.get(count_mirror))]);
	$.delegated('click', button, () => $.update(count));
	$.delegated('click', button_1, () => $.update(unrelated));
	$.delegated('click', button_2, () => queued.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);