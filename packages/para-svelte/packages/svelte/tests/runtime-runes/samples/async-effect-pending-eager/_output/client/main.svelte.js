import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_1 = $.from_html(`<p> </p> <!>`, 1);
var root = $.from_html(`<button>increment</button> <button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let value = $.state(0);
	let queued = [];

	function delayed(v) {
		if (!v) return v;

		return new Promise((resolve) => {
			queued.push(() => resolve(v));
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var text = $.sibling(button_1);
	var node = $.sibling(text);

	{
		var consequent_1 = ($$anchor) => {
			let tmp;

			var promises = $.run([
				async () => tmp = (await $.save($.async_derived(async () => (await $.save(delayed($.get(value))))())))()
			]);

			var fragment_1 = root_1();
			var p = $.first_child(fragment_1);
			var text_1 = $.child(p);

			$.reset(p);

			var node_1 = $.sibling(p, 2);

			{
				var consequent = ($$anchor) => {
					var p_1 = root_2();

					$.append($$anchor, p_1);
				};

				var alternate = ($$anchor) => {
					var p_2 = root_3();
					var text_2 = $.child(p_2, true);

					$.reset(p_2);
					$.template_effect(() => $.set_text(text_2, $.get(tmp)), void 0, void 0, [promises[0]]);
					$.append($$anchor, p_2);
				};

				$.if(node_1, ($$render) => {
					if ($.eager($.pending) > 0) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.template_effect(() => $.set_text(text_1, `pending: ${$.eager($.pending) ?? ''}`));
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (1) $$render(consequent_1);
		});
	}

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''} `), [() => $.eager(() => $.get(value))]);
	$.delegated('click', button, () => $.update(value));
	$.delegated('click', button_1, () => queued.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);