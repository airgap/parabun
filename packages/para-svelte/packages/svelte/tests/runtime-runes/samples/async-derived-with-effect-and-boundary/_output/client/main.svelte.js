import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>Loading...</p>`);
var root_3 = $.from_html(`<p></p>`);
var root = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let foo = $.state(null);

	$.user_effect(() => {
		$.set(foo, 69);
	});

	var bar, baz, qux;

	var $$promises = $.run([
		async () => bar = await $.async_derived(() => 1),
		() => {
			baz = $.derived(() => $.get(foo) ? $.get(foo) * $.get(bar) : null);
			qux = "qux";
		}
	]);

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		const pending = ($$anchor) => {
			var p_1 = root_1();

			$.append($$anchor, p_1);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [$$promises[1]], void 0, (node_1) => {
				var consequent = ($$anchor) => {
					var p_2 = root_3();

					$.append($$anchor, p_2);
				};

				$.if(node_1, ($$render) => {
					if (qux) $$render(consequent);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.template_effect(() => $.set_text(text, `baz: ${$.get(baz) ?? ''}`), void 0, void 0, [$$promises[1]]);
	$.append($$anchor, fragment);
	$.pop();
}