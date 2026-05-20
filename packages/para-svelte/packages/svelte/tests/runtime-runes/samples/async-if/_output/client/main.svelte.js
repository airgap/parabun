import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<h1>yes</h1>`);
var root_4 = $.from_html(`<h1>no</h1>`);
var root = $.from_html(`<button>shift</button> <button>true</button> <button>false</button> <!>`, 1);

export default function Main($$anchor) {
	let condition = $.state(true);
	let deferreds = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		deferreds.push({ deferred, value });

		return deferred.promise;
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
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [() => push($.get(condition))], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var h1 = root_3();

					$.append($$anchor, h1);
				};

				var alternate = ($$anchor) => {
					var h1_1 = root_4();

					$.append($$anchor, h1_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent); else $$render(alternate, -1);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		const d = deferreds.shift();

		d?.deferred.resolve(d.value);
	});

	$.delegated('click', button_1, () => $.set(condition, true));
	$.delegated('click', button_2, () => $.set(condition, false));
	$.append($$anchor, fragment);
}

$.delegate(['click']);