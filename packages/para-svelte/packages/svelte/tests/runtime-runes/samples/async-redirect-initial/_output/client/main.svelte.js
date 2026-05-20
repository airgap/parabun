import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending...</p>`);
var root_2 = $.from_html(`<button>retry</button>`);
var root_4 = $.from_html(`<p>a</p>`);
var root_6 = $.from_html(`<p>b</p>`);
var root_8 = $.from_html(`<p>c</p>`);
var root_3 = $.from_html(`<!> <!> <!>`, 1);
var root = $.from_html(`<h1> </h1> <button>a</button> <button>b</button> <button>c</button> <button>ok</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let route = $.state('b');
	let ok = $.state(false);

	function goto(r) {
		return Promise.resolve().then(() => {
			$.set(route, r, true);

			throw new Error('nope');
		});
	}

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1, true);

	$.reset(h1);

	var button = $.sibling(h1, 2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var node = $.sibling(button_3, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		const failed = ($$anchor, error = $.noop, reset = $.noop) => {
			var button_4 = root_2();

			$.delegated('click', button_4, function (...$$args) {
				reset()?.apply(this, $$args);
			});

			$.append($$anchor, button_4);
		};

		$.boundary(node, { pending, failed }, ($$anchor) => {
			var fragment_1 = root_3();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var p_1 = root_4();

					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get(route) === 'a') $$render(consequent);
				});
			}

			var node_2 = $.sibling(node_1, 2);

			{
				var consequent_2 = ($$anchor) => {
					var fragment_2 = $.comment();
					var node_3 = $.first_child(fragment_2);

					{
						var consequent_1 = ($$anchor) => {
							var p_2 = root_6();

							$.append($$anchor, p_2);
						};

						var alternate = ($$anchor) => {
							var text_1 = $.text();

							$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => goto('c')]);
							$.append($$anchor, text_1);
						};

						$.if(node_3, ($$render) => {
							if ($.get(ok)) $$render(consequent_1); else $$render(alternate, -1);
						});
					}

					$.append($$anchor, fragment_2);
				};

				$.if(node_2, ($$render) => {
					if ($.get(route) === 'b') $$render(consequent_2);
				});
			}

			var node_4 = $.sibling(node_2, 2);

			{
				var consequent_3 = ($$anchor) => {
					var p_3 = root_8();

					$.append($$anchor, p_3);
				};

				$.if(node_4, ($$render) => {
					if ($.get(route) === 'c') $$render(consequent_3);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.template_effect(() => $.set_text(text, $.get(route)));
	$.delegated('click', button, () => $.set(route, 'a'));
	$.delegated('click', button_1, () => $.set(route, 'b'));
	$.delegated('click', button_2, () => $.set(route, 'c'));
	$.delegated('click', button_3, () => $.set(ok, true));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);