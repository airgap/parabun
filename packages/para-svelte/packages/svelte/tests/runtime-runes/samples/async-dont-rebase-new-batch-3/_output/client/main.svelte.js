import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<!> `, 1);
var root = $.from_html(`<button> </button> <button>shift</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let double = $.derived(() => $.get(count) * 2);
	let count_mirror = $.state(0);
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
			var fragment_1 = root_1();
			var node_1 = $.first_child(fragment_1);

			{
				const pending = ($$anchor) => {
					$.next();

					var text_1 = $.text('loading');

					$.append($$anchor, text_1);
				};

				$.boundary(node_1, { pending }, ($$anchor) => {
					$.next();

					var text_2 = $.text();

					$.template_effect(($0) => $.set_text(text_2, $0), void 0, [() => delay($.get(count))]);
					$.append($$anchor, text_2);
				});
			}

			var text_3 = $.sibling(node_1);

			$.template_effect(($0, $1) => $.set_text(text_3, `  ${$0 ?? ''} ${$1 ?? ''}`), [
				() => (() => {
					$.user_effect(() => {
						$.set(count_mirror, $.get(count), true);
					});
				})(),

				() => (() => {
					$.user_effect(() => {
						console.log($.get(double));
					});
				})()
			]);

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(count)) $$render(consequent);
		});
	}

	$.template_effect(($0, $1) => $.set_text(text, `count ${$0 ?? ''} | count_mirror ${$1 ?? ''}`), void 0, [() => delay($.get(count)), () => delay($.get(count_mirror))]);
	$.delegated('click', button, () => $.update(count));
	$.delegated('click', button_1, () => queued.shift()?.());
	$.delegated('click', button_2, () => queued.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);