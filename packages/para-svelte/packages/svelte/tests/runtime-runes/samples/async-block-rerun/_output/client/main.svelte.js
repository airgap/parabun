import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending...</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<!> <!>`, 1);
var root = $.from_html(`<button>override</button> <button>release</button> <button>resolve</button> <!>`, 1);

export default function Main($$anchor) {
	let deferred = Promise.withResolvers();
	let value = $.state(void 0);
	let override = $.state(void 0);
	let current = $.derived(() => $.get(override) ?? $.get(value));
	let promise = $.state($.proxy(update(['before'])));

	async function update(v) {
		deferred = Promise.withResolvers();
		await deferred.promise;
		$.set(value, v, true);
	}

	function indirect() {
		$.get(override);

		return $.get(promise).then(() => $.get(current));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [indirect], (node_1, $$collection) => {
				$.each(node_1, 17, () => $.get($$collection), $.index, ($$anchor, entry) => {
					var p_1 = root_3();
					var text = $.child(p_1, true);

					$.reset(p_1);
					$.template_effect(() => $.set_text(text, $.get(entry)));
					$.append($$anchor, p_1);
				});
			});

			var node_2 = $.sibling(node_1, 2);

			$.each(node_2, 17, () => $.get(current), $.index, ($$anchor, entry) => {
				var p_2 = root_4();
				var text_1 = $.child(p_2, true);

				$.reset(p_2);
				$.template_effect(() => $.set_text(text_1, $.get(entry)));
				$.append($$anchor, p_2);
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		$.set(override, ['during'], true);
	});

	$.delegated('click', button_1, () => {
		$.set(override, null);
		$.set(promise, update(['after']), true);
	});

	$.delegated('click', button_2, () => {
		deferred.resolve(null);
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);