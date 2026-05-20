import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>loading...</p>`);
var root_4 = $.from_html(`<p> </p>`);
var root_6 = $.from_html(`<p>loading...</p>`);
var root = $.from_html(`<button>fulfil</button> <!> <hr/> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let fulfil;
	let promise = new Promise((f) => fulfil = f);
	let a = $$props.browser ? promise : 42;
	let b = $$props.browser ? 42 : promise;
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.await(
		node,
		() => a,
		($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if (true) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		},
		($$anchor, a) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(a)));
			$.append($$anchor, p);
		}
	);

	var node_2 = $.sibling(node, 4);

	$.await(
		node_2,
		() => b,
		($$anchor) => {
			var fragment_2 = $.comment();
			var node_3 = $.first_child(fragment_2);

			{
				var consequent_1 = ($$anchor) => {
					var p_3 = root_6();

					$.append($$anchor, p_3);
				};

				$.if(node_3, ($$render) => {
					if (true) $$render(consequent_1);
				});
			}

			$.append($$anchor, fragment_2);
		},
		($$anchor, b) => {
			var p_2 = root_4();
			var text_1 = $.child(p_2, true);

			$.reset(p_2);
			$.template_effect(() => $.set_text(text_1, $.get(b)));
			$.append($$anchor, p_2);
		}
	);

	$.delegated('click', button, () => fulfil(42));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);