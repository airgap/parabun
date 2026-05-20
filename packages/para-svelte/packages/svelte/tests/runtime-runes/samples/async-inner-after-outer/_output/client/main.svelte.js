import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<!> <button>toggle</button>`, 1);
var root = $.from_html(`<!> <button>shift</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let show = $.state(true);
	let count = $.state(0);
	let queue = [];

	function foo() {
		const { promise, resolve } = Promise.withResolvers();
		const s = $.get(show);

		queue.push(() => resolve(s));

		return promise;
	}

	function bar() {
		const { promise, resolve } = Promise.withResolvers();
		const s = $.get(show);

		queue.push(() => {
			// This will create a new batch while the other batch is still in flight
			$.update(count);

			resolve(s);
		});

		return promise;
	}

	$.user_effect(() => {
		$.get(count);
	});

	var fragment = root();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [foo], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var p_1 = root_3();
					var text = $.child(p_1, true);

					$.reset(p_1);
					$.template_effect(($0) => $.set_text(text, $0), void 0, [() => bar()]);
					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent);
				});
			});

			var button = $.sibling(node_1, 2);

			$.delegated('click', button, () => {
				$.set(show, !$.get(show));
			});

			$.append($$anchor, fragment_1);
		});
	}

	var button_1 = $.sibling(node, 2);

	$.delegated('click', button_1, () => queue.shift()());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);