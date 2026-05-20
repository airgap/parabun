import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let desks = $.prop($$props, 'desks', 28, () => [{ id: 1, teams: [{ id: 1 }] }]);

	var $$exports = {
		get desks() {
			return desks();
		},

		set desks($$value) {
			desks($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, desks, (desk) => desk.id, ($$anchor, desk) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, () => ($.get(desk), $.untrack(() => $.get(desk).teams)), (team) => team.id, ($$anchor, team) => {
			Child($$anchor, {
				get id() {
					return ($.get(team), $.untrack(() => $.get(team).id));
				}
			});
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}